import logging
import time
from datetime import datetime

import dask
import torch
from dask.distributed import Client
from dask.distributed import Future
from distributed import LocalCluster
from sqlalchemy.orm import Session

from danswer.background.indexing.dask_utils import ResourceLogger
from danswer.background.indexing.job_client import SimpleJob
from danswer.background.indexing.job_client import SimpleJobClient
from danswer.background.indexing.run_indexing import run_indexing_entrypoint
from danswer.configs.app_configs import CLEANUP_INDEXING_JOBS_TIMEOUT
from danswer.configs.app_configs import DASK_JOB_CLIENT_ENABLED
from danswer.configs.app_configs import LOG_LEVEL
from danswer.configs.app_configs import NUM_INDEXING_WORKERS
from danswer.configs.model_configs import MIN_THREADS_ML_MODELS
from danswer.db.connector import fetch_connectors
from danswer.db.connector_credential_pair import mark_all_in_progress_cc_pairs_failed
from danswer.db.connector_credential_pair import update_connector_credential_pair
from danswer.db.engine import get_db_current_time
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.index_attempt import create_index_attempt
from danswer.db.index_attempt import get_index_attempt
from danswer.db.index_attempt import get_inprogress_index_attempts
from danswer.db.index_attempt import get_last_attempt
from danswer.db.index_attempt import get_not_started_index_attempts
from danswer.db.index_attempt import mark_attempt_failed
from danswer.db.models import Connector
from danswer.db.models import IndexAttempt
from danswer.db.models import IndexingStatus
from danswer.utils.logger import setup_logger

logger = setup_logger()

# If the indexing dies, it's most likely due to resource constraints,
# restarting just delays the eventual failure, not useful to the user
dask.config.set({"distributed.scheduler.allowed-failures": 0})

_UNEXPECTED_STATE_FAILURE_REASON = (
    "Stopped mid run, likely due to the background process being killed"
)


"""Util funcs"""


def _get_num_threads() -> int:
    """Get # of "threads" to use for ML models in an indexing job. By default uses
    the torch implementation, which returns the # of physical cores on the machine.
    """
    return max(MIN_THREADS_ML_MODELS, torch.get_num_threads())


def _should_create_new_indexing(
    connector: Connector, last_index: IndexAttempt | None, db_session: Session
) -> bool:
    if connector.refresh_freq is None:
        return False
    if not last_index:
        return True

    # only one scheduled job per connector at a time
    if last_index.status == IndexingStatus.NOT_STARTED:
        return False

    current_db_time = get_db_current_time(db_session)
    time_since_index = current_db_time - last_index.time_updated
    return time_since_index.total_seconds() >= connector.refresh_freq


def _is_indexing_job_marked_as_finished(index_attempt: IndexAttempt | None) -> bool:
    if index_attempt is None:
        return False

    return (
        index_attempt.status == IndexingStatus.FAILED
        or index_attempt.status == IndexingStatus.SUCCESS
    )


def _mark_run_failed(
    db_session: Session, index_attempt: IndexAttempt, failure_reason: str
) -> None:
    """Marks the `index_attempt` row as failed + updates the `
    connector_credential_pair` to reflect that the run failed"""
    logger.warning(
        f"Marking in-progress attempt 'connector: {index_attempt.connector_id}, "
        f"credential: {index_attempt.credential_id}' as failed due to {failure_reason}"
    )
    mark_attempt_failed(
        index_attempt=index_attempt,
        db_session=db_session,
        failure_reason=failure_reason,
    )
    if (
        index_attempt.connector_id is not None
        and index_attempt.credential_id is not None
    ):
        update_connector_credential_pair(
            db_session=db_session,
            connector_id=index_attempt.connector_id,
            credential_id=index_attempt.credential_id,
            attempt_status=IndexingStatus.FAILED,
        )


"""Main funcs"""


def create_indexing_jobs(existing_jobs: dict[int, Future | SimpleJob]) -> None:
    """Creates new indexing jobs for each connector / credential pair which is:
    1. Enabled
    2. `refresh_frequency` time has passed since the last indexing run for this pair
    3. There is not already an ongoing indexing attempt for this pair
    """
    with Session(get_sqlalchemy_engine()) as db_session:
        ongoing_pairs: set[tuple[int | None, int | None]] = set()
        for attempt_id in existing_jobs:
            attempt = get_index_attempt(
                db_session=db_session, index_attempt_id=attempt_id
            )
            if attempt is None:
                logger.error(
                    f"Unable to find IndexAttempt for ID '{attempt_id}' when creating "
                    "indexing jobs"
                )
                continue
            ongoing_pairs.add((attempt.connector_id, attempt.credential_id))

        enabled_connectors = fetch_connectors(db_session, disabled_status=False)
        for connector in enabled_connectors:
            for association in connector.credentials:
                credential = association.credential

                # check if there is an ongoing indexing attempt for this connector + credential pair
                if (connector.id, credential.id) in ongoing_pairs:
                    continue

                last_attempt = get_last_attempt(connector.id, credential.id, db_session)
                if not _should_create_new_indexing(connector, last_attempt, db_session):
                    continue
                create_index_attempt(connector.id, credential.id, db_session)

                update_connector_credential_pair(
                    db_session=db_session,
                    connector_id=connector.id,
                    credential_id=credential.id,
                    attempt_status=IndexingStatus.NOT_STARTED,
                )


def cleanup_indexing_jobs(
    existing_jobs: dict[int, Future | SimpleJob],
    timeout_hours: int = CLEANUP_INDEXING_JOBS_TIMEOUT,
) -> dict[int, Future | SimpleJob]:
    existing_jobs_copy = existing_jobs.copy()

    # clean up completed jobs
    with Session(get_sqlalchemy_engine()) as db_session:
        for attempt_id, job in existing_jobs.items():
            index_attempt = get_index_attempt(
                db_session=db_session, index_attempt_id=attempt_id
            )

            # do nothing for ongoing jobs that haven't been stopped
            if not job.done() and not _is_indexing_job_marked_as_finished(
                index_attempt
            ):
                continue

            if job.status == "error":
                logger.error(job.exception())

            job.release()
            del existing_jobs_copy[attempt_id]

            if not index_attempt:
                logger.error(
                    f"Unable to find IndexAttempt for ID '{attempt_id}' when cleaning "
                    "up indexing jobs"
                )
                continue

            if (
                index_attempt.status == IndexingStatus.IN_PROGRESS
                or job.status == "error"
            ):
                _mark_run_failed(
                    db_session=db_session,
                    index_attempt=index_attempt,
                    failure_reason=_UNEXPECTED_STATE_FAILURE_REASON,
                )

        # clean up in-progress jobs that were never completed
        connectors = fetch_connectors(db_session)
        for connector in connectors:
            in_progress_indexing_attempts = get_inprogress_index_attempts(
                connector.id, db_session
            )
            for index_attempt in in_progress_indexing_attempts:
                if index_attempt.id in existing_jobs:
                    # check to see if the job has been updated in last `timeout_hours` hours, if not
                    # assume it to frozen in some bad state and just mark it as failed. Note: this relies
                    # on the fact that the `time_updated` field is constantly updated every
                    # batch of documents indexed
                    current_db_time = get_db_current_time(db_session=db_session)
                    time_since_update = current_db_time - index_attempt.time_updated
                    if time_since_update.total_seconds() > 60 * 60 * timeout_hours:
                        existing_jobs[index_attempt.id].cancel()
                        _mark_run_failed(
                            db_session=db_session,
                            index_attempt=index_attempt,
                            failure_reason="Indexing run frozen - no updates in the last three hours. "
                            "The run will be re-attempted at next scheduled indexing time.",
                        )
                else:
                    # If job isn't known, simply mark it as failed
                    _mark_run_failed(
                        db_session=db_session,
                        index_attempt=index_attempt,
                        failure_reason=_UNEXPECTED_STATE_FAILURE_REASON,
                    )

    return existing_jobs_copy


def kickoff_indexing_jobs(
    existing_jobs: dict[int, Future | SimpleJob],
    client: Client | SimpleJobClient,
) -> dict[int, Future | SimpleJob]:
    existing_jobs_copy = existing_jobs.copy()
    engine = get_sqlalchemy_engine()

    # Don't include jobs waiting in the Dask queue that just haven't started running
    # Also (rarely) don't include for jobs that started but haven't updated the indexing tables yet
    with Session(engine) as db_session:
        new_indexing_attempts = [
            attempt
            for attempt in get_not_started_index_attempts(db_session)
            if attempt.id not in existing_jobs
        ]

    logger.info(f"Found {len(new_indexing_attempts)} new indexing tasks.")

    if not new_indexing_attempts:
        return existing_jobs

    for attempt in new_indexing_attempts:
        if attempt.connector is None:
            logger.warning(
                f"Skipping index attempt as Connector has been deleted: {attempt}"
            )
            with Session(engine) as db_session:
                mark_attempt_failed(
                    attempt, db_session, failure_reason="Connector is null"
                )
            continue
        if attempt.credential is None:
            logger.warning(
                f"Skipping index attempt as Credential has been deleted: {attempt}"
            )
            with Session(engine) as db_session:
                mark_attempt_failed(
                    attempt, db_session, failure_reason="Credential is null"
                )
            continue

        run = client.submit(
            run_indexing_entrypoint, attempt.id, _get_num_threads(), pure=False
        )
        if run:
            logger.info(
                f"Kicked off indexing attempt for connector: '{attempt.connector.name}', "
                f"with config: '{attempt.connector.connector_specific_config}', and "
                f"with credentials: '{attempt.credential_id}'"
            )
            existing_jobs_copy[attempt.id] = run

    return existing_jobs_copy


def update_loop(delay: int = 10, num_workers: int = NUM_INDEXING_WORKERS) -> None:
    client: Client | SimpleJobClient
    if DASK_JOB_CLIENT_ENABLED:
        cluster = LocalCluster(
            n_workers=num_workers,
            threads_per_worker=1,
            # there are warning about high memory usage + "Event loop unresponsive"
            # which are not relevant to us since our workers are expected to use a
            # lot of memory + involve CPU intensive tasks that will not relinquish
            # the event loop
            silence_logs=logging.ERROR,
        )
        client = Client(cluster)
        if LOG_LEVEL.lower() == "debug":
            client.register_worker_plugin(ResourceLogger())
    else:
        client = SimpleJobClient(n_workers=num_workers)

    existing_jobs: dict[int, Future | SimpleJob] = {}
    engine = get_sqlalchemy_engine()

    with Session(engine) as db_session:
        # Previous version did not always clean up cc-pairs well leaving some connectors undeleteable
        # This ensures that bad states get cleaned up
        mark_all_in_progress_cc_pairs_failed(db_session)

    while True:
        start = time.time()
        start_time_utc = datetime.utcfromtimestamp(start).strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"Running update, current UTC time: {start_time_utc}")

        if existing_jobs:
            # TODO: make this debug level once the "no jobs are being scheduled" issue is resolved
            logger.info(
                "Found existing indexing jobs: "
                f"{[(attempt_id, job.status) for attempt_id, job in existing_jobs.items()]}"
            )

        try:
            existing_jobs = cleanup_indexing_jobs(existing_jobs=existing_jobs)
            create_indexing_jobs(existing_jobs=existing_jobs)
            existing_jobs = kickoff_indexing_jobs(
                existing_jobs=existing_jobs, client=client
            )
        except Exception as e:
            logger.exception(f"Failed to run update due to {e}")
        sleep_time = delay - (time.time() - start)
        if sleep_time > 0:
            time.sleep(sleep_time)


def update__main() -> None:
    # needed for CUDA to work with multiprocessing
    # NOTE: needs to be done on application startup
    # before any other torch code has been run
    if not DASK_JOB_CLIENT_ENABLED:
        torch.multiprocessing.set_start_method("spawn")

    logger.info("Starting Indexing Loop")
    update_loop()


if __name__ == "__main__":
    update__main()
