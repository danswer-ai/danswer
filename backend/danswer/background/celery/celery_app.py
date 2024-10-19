import logging
import multiprocessing
import time
from datetime import timedelta
from typing import Any

import redis
import sentry_sdk
from celery import bootsteps  # type: ignore
from celery import Celery
from celery import current_task
from celery import signals
from celery import Task
from celery.exceptions import WorkerShutdown
from celery.signals import beat_init
from celery.signals import celeryd_init
from celery.signals import worker_init
from celery.signals import worker_ready
from celery.signals import worker_shutdown
from celery.states import READY_STATES
from celery.utils.log import get_task_logger
from sentry_sdk.integrations.celery import CeleryIntegration

from danswer.background.celery.celery_redis import RedisConnectorCredentialPair
from danswer.background.celery.celery_redis import RedisConnectorDeletion
from danswer.background.celery.celery_redis import RedisConnectorIndexing
from danswer.background.celery.celery_redis import RedisConnectorPruning
from danswer.background.celery.celery_redis import RedisDocumentSet
from danswer.background.celery.celery_redis import RedisUserGroup
from danswer.background.celery.celery_utils import celery_is_worker_primary
from danswer.configs.constants import CELERY_PRIMARY_WORKER_LOCK_TIMEOUT
from danswer.configs.constants import DanswerCeleryPriority
from danswer.configs.constants import DanswerRedisLocks
from danswer.configs.constants import POSTGRES_CELERY_BEAT_APP_NAME
from danswer.configs.constants import POSTGRES_CELERY_WORKER_HEAVY_APP_NAME
from danswer.configs.constants import POSTGRES_CELERY_WORKER_INDEXING_APP_NAME
from danswer.configs.constants import POSTGRES_CELERY_WORKER_LIGHT_APP_NAME
from danswer.configs.constants import POSTGRES_CELERY_WORKER_PRIMARY_APP_NAME
from danswer.db.engine import get_all_tenant_ids
from danswer.db.engine import get_session_with_tenant
from danswer.db.engine import SqlEngine
from danswer.db.search_settings import get_current_search_settings
from danswer.db.swap_index import check_index_swap
from danswer.natural_language_processing.search_nlp_models import EmbeddingModel
from danswer.natural_language_processing.search_nlp_models import warm_up_bi_encoder
from danswer.redis.redis_pool import get_redis_client
from danswer.utils.logger import ColoredFormatter
from danswer.utils.logger import PlainFormatter
from danswer.utils.logger import setup_logger
from shared_configs.configs import INDEXING_MODEL_SERVER_HOST
from shared_configs.configs import MODEL_SERVER_PORT
from shared_configs.configs import SENTRY_DSN

logger = setup_logger()

# use this within celery tasks to get celery task specific logging
task_logger = get_task_logger(__name__)

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[CeleryIntegration()],
        traces_sample_rate=0.5,
    )
    logger.info("Sentry initialized")
else:
    logger.debug("Sentry DSN not provided, skipping Sentry initialization")


celery_app = Celery(__name__)
celery_app.config_from_object(
    "danswer.background.celery.celeryconfig"
)  # Load configuration from 'celeryconfig.py'


@signals.task_prerun.connect
def on_task_prerun(
    sender: Any | None = None,
    task_id: str | None = None,
    task: Task | None = None,
    args: tuple | None = None,
    kwargs: dict | None = None,
    **kwds: Any,
) -> None:
    pass


@signals.task_postrun.connect
def on_task_postrun(
    sender: Any | None = None,
    task_id: str | None = None,
    task: Task | None = None,
    args: tuple | None = None,
    kwargs: dict | None = None,
    retval: Any | None = None,
    state: str | None = None,
    **kwds: Any,
) -> None:
    """We handle this signal in order to remove completed tasks
    from their respective tasksets. This allows us to track the progress of document set
    and user group syncs.

    This function runs after any task completes (both success and failure)
    Note that this signal does not fire on a task that failed to complete and is going
    to be retried.

    This also does not fire if a worker with acks_late=False crashes (which all of our
    long running workers are)
    """
    if not task:
        return

    task_logger.debug(f"Task {task.name} (ID: {task_id}) completed with state: {state}")

    if state not in READY_STATES:
        return

    if not task_id:
        return

    r = get_redis_client()

    if task_id.startswith(RedisConnectorCredentialPair.PREFIX):
        r.srem(RedisConnectorCredentialPair.get_taskset_key(), task_id)
        return

    if task_id.startswith(RedisDocumentSet.PREFIX):
        document_set_id = RedisDocumentSet.get_id_from_task_id(task_id)
        if document_set_id is not None:
            rds = RedisDocumentSet(int(document_set_id))
            r.srem(rds.taskset_key, task_id)
        return

    if task_id.startswith(RedisUserGroup.PREFIX):
        usergroup_id = RedisUserGroup.get_id_from_task_id(task_id)
        if usergroup_id is not None:
            rug = RedisUserGroup(int(usergroup_id))
            r.srem(rug.taskset_key, task_id)
        return

    if task_id.startswith(RedisConnectorDeletion.PREFIX):
        cc_pair_id = RedisConnectorDeletion.get_id_from_task_id(task_id)
        if cc_pair_id is not None:
            rcd = RedisConnectorDeletion(int(cc_pair_id))
            r.srem(rcd.taskset_key, task_id)
        return

    if task_id.startswith(RedisConnectorPruning.SUBTASK_PREFIX):
        cc_pair_id = RedisConnectorPruning.get_id_from_task_id(task_id)
        if cc_pair_id is not None:
            rcp = RedisConnectorPruning(int(cc_pair_id))
            r.srem(rcp.taskset_key, task_id)
        return


@celeryd_init.connect
def on_celeryd_init(sender: Any = None, conf: Any = None, **kwargs: Any) -> None:
    """The first signal sent on celery worker startup"""
    multiprocessing.set_start_method("spawn")  # fork is unsafe, set to spawn


@beat_init.connect
def on_beat_init(sender: Any, **kwargs: Any) -> None:
    SqlEngine.set_app_name(POSTGRES_CELERY_BEAT_APP_NAME)
    SqlEngine.init_engine(pool_size=2, max_overflow=0)


@worker_init.connect
def on_worker_init(sender: Any, **kwargs: Any) -> None:
    logger.info("worker_init signal received.")
    logger.info(f"Multiprocessing start method: {multiprocessing.get_start_method()}")

    # decide some initial startup settings based on the celery worker's hostname
    # (set at the command line)
    hostname = sender.hostname
    if hostname.startswith("light"):
        SqlEngine.set_app_name(POSTGRES_CELERY_WORKER_LIGHT_APP_NAME)
        SqlEngine.init_engine(pool_size=sender.concurrency, max_overflow=8)
    elif hostname.startswith("heavy"):
        SqlEngine.set_app_name(POSTGRES_CELERY_WORKER_HEAVY_APP_NAME)
        SqlEngine.init_engine(pool_size=8, max_overflow=0)
    elif hostname.startswith("indexing"):
        SqlEngine.set_app_name(POSTGRES_CELERY_WORKER_INDEXING_APP_NAME)
        SqlEngine.init_engine(pool_size=8, max_overflow=0)

        # TODO: why is this necessary for the indexer to do?
        with get_session_with_tenant(tenant_id) as db_session:
            check_index_swap(db_session=db_session)
            search_settings = get_current_search_settings(db_session)

            # So that the first time users aren't surprised by really slow speed of first
            # batch of documents indexed

            if search_settings.provider_type is None:
                logger.notice("Running a first inference to warm up embedding model")
                embedding_model = EmbeddingModel.from_db_model(
                    search_settings=search_settings,
                    server_host=INDEXING_MODEL_SERVER_HOST,
                    server_port=MODEL_SERVER_PORT,
                )

                warm_up_bi_encoder(
                    embedding_model=embedding_model,
                )
                logger.notice("First inference complete.")
    else:
        SqlEngine.set_app_name(POSTGRES_CELERY_WORKER_PRIMARY_APP_NAME)
        SqlEngine.init_engine(pool_size=8, max_overflow=0)

    r = get_redis_client()

    WAIT_INTERVAL = 5
    WAIT_LIMIT = 60

    time_start = time.monotonic()
    logger.info("Redis: Readiness check starting.")
    while True:
        try:
            if r.ping():
                break
        except Exception:
            pass

        time_elapsed = time.monotonic() - time_start
        logger.info(
            f"Redis: Ping failed. elapsed={time_elapsed:.1f} timeout={WAIT_LIMIT:.1f}"
        )
        if time_elapsed > WAIT_LIMIT:
            msg = (
                f"Redis: Readiness check did not succeed within the timeout "
                f"({WAIT_LIMIT} seconds). Exiting..."
            )
            logger.error(msg)
            raise WorkerShutdown(msg)

        time.sleep(WAIT_INTERVAL)

    logger.info("Redis: Readiness check succeeded. Continuing...")

    if not celery_is_worker_primary(sender):
        logger.info("Running as a secondary celery worker.")
        logger.info("Waiting for primary worker to be ready...")
        time_start = time.monotonic()
        while True:
            if r.exists(DanswerRedisLocks.PRIMARY_WORKER):
                break

            time.monotonic()
            time_elapsed = time.monotonic() - time_start
            logger.info(
                f"Primary worker is not ready yet. elapsed={time_elapsed:.1f} timeout={WAIT_LIMIT:.1f}"
            )
            if time_elapsed > WAIT_LIMIT:
                msg = (
                    f"Primary worker was not ready within the timeout. "
                    f"({WAIT_LIMIT} seconds). Exiting..."
                )
                logger.error(msg)
                raise WorkerShutdown(msg)

            time.sleep(WAIT_INTERVAL)

        logger.info("Wait for primary worker completed successfully. Continuing...")
        return

    logger.info("Running as the primary celery worker.")

    # This is singleton work that should be done on startup exactly once
    # by the primary worker
    r = get_redis_client()

    # For the moment, we're assuming that we are the only primary worker
    # that should be running.
    # TODO: maybe check for or clean up another zombie primary worker if we detect it
    r.delete(DanswerRedisLocks.PRIMARY_WORKER)

    # this process wide lock is taken to help other workers start up in order.
    # it is planned to use this lock to enforce singleton behavior on the primary
    # worker, since the primary worker does redis cleanup on startup, but this isn't
    # implemented yet.
    lock = r.lock(
        DanswerRedisLocks.PRIMARY_WORKER,
        timeout=CELERY_PRIMARY_WORKER_LOCK_TIMEOUT,
    )

    logger.info("Primary worker lock: Acquire starting.")
    acquired = lock.acquire(blocking_timeout=CELERY_PRIMARY_WORKER_LOCK_TIMEOUT / 2)
    if acquired:
        logger.info("Primary worker lock: Acquire succeeded.")
    else:
        logger.error("Primary worker lock: Acquire failed!")
        raise WorkerShutdown("Primary worker lock could not be acquired!")

    sender.primary_worker_lock = lock

    # As currently designed, when this worker starts as "primary", we reinitialize redis
    # to a clean state (for our purposes, anyway)
    r.delete(DanswerRedisLocks.CHECK_VESPA_SYNC_BEAT_LOCK)
    r.delete(DanswerRedisLocks.MONITOR_VESPA_SYNC_BEAT_LOCK)

    r.delete(RedisConnectorCredentialPair.get_taskset_key())
    r.delete(RedisConnectorCredentialPair.get_fence_key())

    for key in r.scan_iter(RedisDocumentSet.TASKSET_PREFIX + "*"):
        r.delete(key)

    for key in r.scan_iter(RedisDocumentSet.FENCE_PREFIX + "*"):
        r.delete(key)

    for key in r.scan_iter(RedisUserGroup.TASKSET_PREFIX + "*"):
        r.delete(key)

    for key in r.scan_iter(RedisUserGroup.FENCE_PREFIX + "*"):
        r.delete(key)

    for key in r.scan_iter(RedisConnectorDeletion.TASKSET_PREFIX + "*"):
        r.delete(key)

    for key in r.scan_iter(RedisConnectorDeletion.FENCE_PREFIX + "*"):
        r.delete(key)

    for key in r.scan_iter(RedisConnectorPruning.TASKSET_PREFIX + "*"):
        r.delete(key)

    for key in r.scan_iter(RedisConnectorPruning.GENERATOR_COMPLETE_PREFIX + "*"):
        r.delete(key)

    for key in r.scan_iter(RedisConnectorPruning.GENERATOR_PROGRESS_PREFIX + "*"):
        r.delete(key)

    for key in r.scan_iter(RedisConnectorPruning.FENCE_PREFIX + "*"):
        r.delete(key)

    for key in r.scan_iter(RedisConnectorIndexing.TASKSET_PREFIX + "*"):
        r.delete(key)

    for key in r.scan_iter(RedisConnectorIndexing.GENERATOR_COMPLETE_PREFIX + "*"):
        r.delete(key)

    for key in r.scan_iter(RedisConnectorIndexing.GENERATOR_PROGRESS_PREFIX + "*"):
        r.delete(key)

    for key in r.scan_iter(RedisConnectorIndexing.FENCE_PREFIX + "*"):
        r.delete(key)


# @worker_process_init.connect
# def on_worker_process_init(sender: Any, **kwargs: Any) -> None:
#     """This only runs inside child processes when the worker is in pool=prefork mode.
#     This may be technically unnecessary since we're finding prefork pools to be
#     unstable and currently aren't planning on using them."""
#     logger.info("worker_process_init signal received.")
#     SqlEngine.set_app_name(POSTGRES_CELERY_WORKER_INDEXING_CHILD_APP_NAME)
#     SqlEngine.init_engine(pool_size=5, max_overflow=0)

#     # https://stackoverflow.com/questions/43944787/sqlalchemy-celery-with-scoped-session-error
#     SqlEngine.get_engine().dispose(close=False)


@worker_ready.connect
def on_worker_ready(sender: Any, **kwargs: Any) -> None:
    task_logger.info("worker_ready signal received.")


@worker_shutdown.connect
def on_worker_shutdown(sender: Any, **kwargs: Any) -> None:
    if not celery_is_worker_primary(sender):
        return

    if not sender.primary_worker_lock:
        return

    logger.info("Releasing primary worker lock.")
    lock = sender.primary_worker_lock
    if lock.owned():
        lock.release()
        sender.primary_worker_lock = None


class CeleryTaskPlainFormatter(PlainFormatter):
    def format(self, record: logging.LogRecord) -> str:
        task = current_task
        if task and task.request:
            record.__dict__.update(task_id=task.request.id, task_name=task.name)
            record.msg = f"[{task.name}({task.request.id})] {record.msg}"

        return super().format(record)


class CeleryTaskColoredFormatter(ColoredFormatter):
    def format(self, record: logging.LogRecord) -> str:
        task = current_task
        if task and task.request:
            record.__dict__.update(task_id=task.request.id, task_name=task.name)
            record.msg = f"[{task.name}({task.request.id})] {record.msg}"

        return super().format(record)


@signals.setup_logging.connect
def on_setup_logging(
    loglevel: Any, logfile: Any, format: Any, colorize: Any, **kwargs: Any
) -> None:
    # TODO: could unhardcode format and colorize and accept these as options from
    # celery's config

    # reformats the root logger
    root_logger = logging.getLogger()

    root_handler = logging.StreamHandler()  # Set up a handler for the root logger
    root_formatter = ColoredFormatter(
        "%(asctime)s %(filename)30s %(lineno)4s: %(message)s",
        datefmt="%m/%d/%Y %I:%M:%S %p",
    )
    root_handler.setFormatter(root_formatter)
    root_logger.addHandler(root_handler)  # Apply the handler to the root logger

    if logfile:
        root_file_handler = logging.FileHandler(logfile)
        root_file_formatter = PlainFormatter(
            "%(asctime)s %(filename)30s %(lineno)4s: %(message)s",
            datefmt="%m/%d/%Y %I:%M:%S %p",
        )
        root_file_handler.setFormatter(root_file_formatter)
        root_logger.addHandler(root_file_handler)

    root_logger.setLevel(loglevel)

    # reformats celery's task logger
    task_formatter = CeleryTaskColoredFormatter(
        "%(asctime)s %(filename)30s %(lineno)4s: %(message)s",
        datefmt="%m/%d/%Y %I:%M:%S %p",
    )
    task_handler = logging.StreamHandler()  # Set up a handler for the task logger
    task_handler.setFormatter(task_formatter)
    task_logger.addHandler(task_handler)  # Apply the handler to the task logger

    if logfile:
        task_file_handler = logging.FileHandler(logfile)
        task_file_formatter = CeleryTaskPlainFormatter(
            "%(asctime)s %(filename)30s %(lineno)4s: %(message)s",
            datefmt="%m/%d/%Y %I:%M:%S %p",
        )
        task_file_handler.setFormatter(task_file_formatter)
        task_logger.addHandler(task_file_handler)

    task_logger.setLevel(loglevel)
    task_logger.propagate = False


class HubPeriodicTask(bootsteps.StartStopStep):
    """Regularly reacquires the primary worker lock outside of the task queue.
    Use the task_logger in this class to avoid double logging.

    This cannot be done inside a regular beat task because it must run on schedule and
    a queue of existing work would starve the task from running.
    """

    # it's unclear to me whether using the hub's timer or the bootstep timer is better
    requires = {"celery.worker.components:Hub"}

    def __init__(self, worker: Any, **kwargs: Any) -> None:
        self.interval = CELERY_PRIMARY_WORKER_LOCK_TIMEOUT / 8  # Interval in seconds
        self.task_tref = None

    def start(self, worker: Any) -> None:
        if not celery_is_worker_primary(worker):
            return

        # Access the worker's event loop (hub)
        hub = worker.consumer.controller.hub

        # Schedule the periodic task
        self.task_tref = hub.call_repeatedly(
            self.interval, self.run_periodic_task, worker
        )
        task_logger.info("Scheduled periodic task with hub.")

    def run_periodic_task(self, worker: Any) -> None:
        try:
            if not worker.primary_worker_lock:
                return

            if not hasattr(worker, "primary_worker_lock"):
                return

            r = get_redis_client()

            lock: redis.lock.Lock = worker.primary_worker_lock

            if lock.owned():
                task_logger.debug("Reacquiring primary worker lock.")
                lock.reacquire()
            else:
                task_logger.warning(
                    "Full acquisition of primary worker lock. "
                    "Reasons could be computer sleep or a clock change."
                )
                lock = r.lock(
                    DanswerRedisLocks.PRIMARY_WORKER,
                    timeout=CELERY_PRIMARY_WORKER_LOCK_TIMEOUT,
                )

                task_logger.info("Primary worker lock: Acquire starting.")
                acquired = lock.acquire(
                    blocking_timeout=CELERY_PRIMARY_WORKER_LOCK_TIMEOUT / 2
                )
                if acquired:
                    task_logger.info("Primary worker lock: Acquire succeeded.")
                else:
                    task_logger.error("Primary worker lock: Acquire failed!")
                    raise TimeoutError("Primary worker lock could not be acquired!")

                worker.primary_worker_lock = lock
        except Exception:
            task_logger.exception("HubPeriodicTask.run_periodic_task exceptioned.")

    def stop(self, worker: Any) -> None:
        # Cancel the scheduled task when the worker stops
        if self.task_tref:
            self.task_tref.cancel()
            task_logger.info("Canceled periodic task with hub.")


celery_app.steps["worker"].add(HubPeriodicTask)

celery_app.autodiscover_tasks(
    [
        "danswer.background.celery.tasks.connector_deletion",
        "danswer.background.celery.tasks.indexing",
        "danswer.background.celery.tasks.periodic",
        "danswer.background.celery.tasks.pruning",
        "danswer.background.celery.tasks.shared",
        "danswer.background.celery.tasks.vespa",
    ]
)

#####
# Celery Beat (Periodic Tasks) Settings
#####

tenant_ids = get_all_tenant_ids()

tasks_to_schedule = [
    {
        "name": "check-for-vespa-sync",
        "task": "check_for_vespa_sync_task",
        "schedule": timedelta(seconds=5),
        "options": {"priority": DanswerCeleryPriority.HIGH},
    },
    {
        "name": "check-for-connector-deletion",
        "task": "check_for_connector_deletion_task",
        "schedule": timedelta(seconds=60),
        "options": {"priority": DanswerCeleryPriority.HIGH},
    },
    {
        "name": "check-for-indexing",
        "task": "check_for_indexing",
        "schedule": timedelta(seconds=10),
        "options": {"priority": DanswerCeleryPriority.HIGH},
    },
    {
        "name": "check-for-prune",
        "task": "check_for_pruning",
        "schedule": timedelta(seconds=10),
        "options": {"priority": DanswerCeleryPriority.HIGH},
    },
    {
        "name": "kombu-message-cleanup",
        "task": "kombu_message_cleanup_task",
        "schedule": timedelta(seconds=3600),
        "options": {"priority": DanswerCeleryPriority.LOWEST},
    },
    {
        "name": "monitor-vespa-sync",
        "task": "monitor_vespa_sync",
        "schedule": timedelta(seconds=5),
        "options": {"priority": DanswerCeleryPriority.HIGH},
    },
]

# Build the celery beat schedule dynamically
beat_schedule = {}

for tenant_id in tenant_ids:
    for task in tasks_to_schedule:
        task_name = f"{task['name']}-{tenant_id}"  # Unique name for each scheduled task
        beat_schedule[task_name] = {
            "task": task["task"],
            "schedule": task["schedule"],
            "options": task["options"],
            "args": (tenant_id,),  # Must pass tenant_id as an argument
        }

# Include any existing beat schedules
existing_beat_schedule = celery_app.conf.beat_schedule or {}
beat_schedule.update(existing_beat_schedule)

# Update the Celery app configuration once
celery_app.conf.beat_schedule = beat_schedule
