"""Custom client that works similarly to Dask, but simpler and more lightweight.
Dask jobs behaved very strangely - they would die all the time, retries would
not follow the expected behavior, etc.

NOTE: cannot use Celery directly due to
https://github.com/celery/celery/issues/7007#issuecomment-1740139367"""
import traceback
from collections.abc import Callable
from dataclasses import dataclass
from functools import partial
from multiprocessing import Process
from multiprocessing import Queue
from typing import Any
from typing import Literal
from typing import Optional

from danswer.configs.constants import POSTGRES_CELERY_WORKER_INDEXING_CHILD_APP_NAME
from danswer.db.engine import SqlEngine
from danswer.utils.logger import setup_logger

logger = setup_logger()

JobStatusType = (
    Literal["error"]
    | Literal["finished"]
    | Literal["pending"]
    | Literal["running"]
    | Literal["cancelled"]
)


def _initializer(
    func: Callable, args: list | tuple, kwargs: dict[str, Any] | None = None
) -> Any:
    """Ensure the parent proc's database connections are not touched
    in the new connection pool

    Based on the recommended approach in the SQLAlchemy docs found:
    https://docs.sqlalchemy.org/en/20/core/pooling.html#using-connection-pools-with-multiprocessing-or-os-fork
    """
    if kwargs is None:
        kwargs = {}

    logger.info("Initializing spawned worker child process.")
    SqlEngine.set_app_name(POSTGRES_CELERY_WORKER_INDEXING_CHILD_APP_NAME)
    SqlEngine.init_engine(pool_size=4, max_overflow=12, pool_recycle=60)
    return func(*args, **kwargs)


def _run_in_process(
    func: Callable, args: list | tuple, kwargs: dict[str, Any] | None = None
) -> None:
    _initializer(func, args, kwargs)


@dataclass
class SimpleJob:
    """Drop in replacement for `dask.distributed.Future`"""

    id: int
    process: Optional["Process"] = None
    exception_info: Optional[str] = None
    exception_queue: Optional[Queue] = None

    def cancel(self) -> bool:
        return self.release()

    def release(self) -> bool:
        if self.process is not None and self.process.is_alive():
            self.process.terminate()
            return True
        return False

    @property
    def status(self) -> JobStatusType:
        if not self.process:
            return "pending"
        elif self.process.is_alive():
            return "running"
        elif self.process.exitcode is None:
            return "cancelled"
        elif self.process.exitcode > 0:
            return "error"
        else:
            return "finished"

    def done(self) -> bool:
        return (
            self.status == "finished"
            or self.status == "cancelled"
            or self.status == "error"
        )

    def exception(self) -> str:
        """Needed to match the Dask API, but not implemented since we don't currently
        have a way to get back the exception information from the child process."""

        if self.exception_info:
            return self.exception_info
        else:
            return f"No exception info available for job with ID '{self.id}'."


def _wrapper(q: Queue, func: Callable, *args: Any, **kwargs: Any) -> None:
    try:
        func(*args, **kwargs)
    except Exception:
        error_trace = traceback.format_exc()
        q.put(error_trace)
        # Re-raise the exception to ensure the process exits with a non-zero code
        raise


class SimpleJobClient:
    def __init__(self, n_workers: int = 1) -> None:
        self.n_workers = n_workers
        self.job_id_counter = 0
        self.jobs: dict[int, SimpleJob] = {}

    def _cleanup_completed_jobs(self) -> None:
        current_job_ids = list(self.jobs.keys())
        for job_id in current_job_ids:
            job = self.jobs.get(job_id)
            if job and job.done():
                logger.debug(f"Cleaning up job with id: '{job.id}'")
                del self.jobs[job.id]

    def submit(self, func: Callable, *args: Any, **kwargs: Any) -> Optional[SimpleJob]:
        self._cleanup_completed_jobs()
        if len(self.jobs) >= self.n_workers:
            logger.debug(
                f"No available workers to run job. Currently running '{len(self.jobs)}' jobs, with a limit of '{self.n_workers}'."
            )
            return None
        self.job_id_counter += 1
        job_id = self.job_id_counter

        q: Queue = Queue()
        wrapped_func = partial(_wrapper, q, func)
        p = Process(target=wrapped_func, args=args, kwargs=kwargs)
        job = SimpleJob(id=job_id, process=p)
        p.start()
        job.process = p
        job.exception_queue = q  # Store the queue in the job object
        self.jobs[job_id] = job
        return job
