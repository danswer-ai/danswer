import logging
import time
from datetime import datetime
from datetime import timezone

from dask.distributed import Client
from dask.distributed import Future
from distributed import LocalCluster
from sqlalchemy.orm import Session

from danswer.configs.app_configs import NUM_INDEXING_WORKERS
from danswer.connectors.factory import instantiate_connector
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.models import IndexAttemptMetadata
from danswer.connectors.models import InputType
from danswer.datastores.indexing_pipeline import build_indexing_pipeline
from danswer.db.connector import disable_connector
from danswer.db.connector import fetch_connectors
from danswer.db.connector_credential_pair import get_last_successful_attempt_time
from danswer.db.connector_credential_pair import mark_all_in_progress_cc_pairs_failed
from danswer.db.connector_credential_pair import update_connector_credential_pair
from danswer.db.credentials import backend_update_credential_json
from danswer.db.engine import get_db_current_time
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.index_attempt import create_index_attempt
from danswer.db.index_attempt import get_index_attempt
from danswer.db.index_attempt import get_inprogress_index_attempts
from danswer.db.index_attempt import get_last_attempt
from danswer.db.index_attempt import get_not_started_index_attempts
from danswer.db.index_attempt import mark_attempt_failed
from danswer.db.index_attempt import mark_attempt_in_progress
from danswer.db.index_attempt import mark_attempt_succeeded
from danswer.db.index_attempt import update_docs_indexed
from danswer.db.models import Connector
from danswer.db.models import IndexAttempt
from danswer.db.models import IndexingStatus
from danswer.search.search_utils import warm_up_models
from danswer.utils.logger import IndexAttemptSingleton
from danswer.utils.logger import setup_logger

logger = setup_logger()

_UNEXPECTED_STATE_FAILURE_REASON = (
    "Stopped mid run, likely due to the background process being killed"
)


def should_create_new_indexing(
    connector: Connector, last_index: IndexAttempt | None, db_session: Session
) -> bool:
    if connector.refresh_freq is None:
        return False
    if not last_index:
        return True
    current_db_time = get_db_current_time(db_session)
    time_since_index = current_db_time - last_index.time_updated
    return time_since_index.total_seconds() >= connector.refresh_freq


def mark_run_failed(
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


def create_indexing_jobs(db_session: Session, existing_jobs: dict[int, Future]) -> None:
    """Creates new indexing jobs for each connector / credential pair which is:
    1. Enabled
    2. `refresh_frequency` time has passed since the last indexing run for this pair
    3. There is not already an ongoing indexing attempt for this pair
    """
    ongoing_pairs: set[tuple[int | None, int | None]] = set()
    for attempt_id in existing_jobs:
        attempt = get_index_attempt(db_session=db_session, index_attempt_id=attempt_id)
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

            # check if there is an ogoing indexing attempt for this connector + credential pair
            if (connector.id, credential.id) in ongoing_pairs:
                continue

            last_attempt = get_last_attempt(connector.id, credential.id, db_session)
            if not should_create_new_indexing(connector, last_attempt, db_session):
                continue
            create_index_attempt(connector.id, credential.id, db_session)

            update_connector_credential_pair(
                db_session=db_session,
                connector_id=connector.id,
                credential_id=credential.id,
                attempt_status=IndexingStatus.NOT_STARTED,
            )


def cleanup_indexing_jobs(
    db_session: Session, existing_jobs: dict[int, Future]
) -> dict[int, Future]:
    existing_jobs_copy = existing_jobs.copy()

    # clean up completed jobs
    for attempt_id, job in existing_jobs.items():
        # do nothing for ongoing jobs
        if not job.done():
            continue

        job.release()
        del existing_jobs_copy[attempt_id]
        index_attempt = get_index_attempt(
            db_session=db_session, index_attempt_id=attempt_id
        )
        if not index_attempt:
            logger.error(
                f"Unable to find IndexAttempt for ID '{attempt_id}' when cleaning "
                "up indexing jobs"
            )
            continue

        if index_attempt.status == IndexingStatus.IN_PROGRESS:
            mark_run_failed(
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
                # check to see if the job has been updated in the last hour, if not
                # assume it to frozen in some bad state and just mark it as failed. Note: this relies
                # on the fact that the `time_updated` field is constantly updated every
                # batch of documents indexed
                current_db_time = get_db_current_time(db_session=db_session)
                time_since_update = current_db_time - index_attempt.time_updated
                if time_since_update.seconds > 60 * 60:
                    existing_jobs[index_attempt.id].cancel()
                    mark_run_failed(
                        db_session=db_session,
                        index_attempt=index_attempt,
                        failure_reason="Indexing run frozen - no updates in last hour. "
                        "The run will be re-attempted at next scheduled indexing time.",
                    )
            else:
                # If job isn't known, simply mark it as failed
                mark_run_failed(
                    db_session=db_session,
                    index_attempt=index_attempt,
                    failure_reason=_UNEXPECTED_STATE_FAILURE_REASON,
                )

    return existing_jobs_copy


def _run_indexing(
    db_session: Session,
    index_attempt: IndexAttempt,
) -> None:
    """
    1. Get documents which are either new or updated from specified application
    2. Embed and index these documents into the chosen datastores (e.g. Qdrant / Typesense or Vespa)
    3. Updates Postgres to record the indexed documents + the outcome of this run
    """

    def _get_document_generator(
        db_session: Session, attempt: IndexAttempt
    ) -> tuple[GenerateDocumentsOutput, float]:
        # "official" timestamp for this run
        # used for setting time bounds when fetching updates from apps and
        # is stored in the DB as the last successful run time if this run succeeds
        run_time = time.time()
        run_dt = datetime.fromtimestamp(run_time, tz=timezone.utc)
        run_time_str = run_dt.strftime("%Y-%m-%d %H:%M:%S")

        task = attempt.connector.input_type

        try:
            runnable_connector, new_credential_json = instantiate_connector(
                attempt.connector.source,
                task,
                attempt.connector.connector_specific_config,
                attempt.credential.credential_json,
            )
            if new_credential_json is not None:
                backend_update_credential_json(
                    attempt.credential, new_credential_json, db_session
                )
        except Exception as e:
            logger.exception(f"Unable to instantiate connector due to {e}")
            disable_connector(attempt.connector.id, db_session)
            raise e

        if task == InputType.LOAD_STATE:
            assert isinstance(runnable_connector, LoadConnector)
            doc_batch_generator = runnable_connector.load_from_state()

        elif task == InputType.POLL:
            assert isinstance(runnable_connector, PollConnector)
            if attempt.connector_id is None or attempt.credential_id is None:
                raise ValueError(
                    f"Polling attempt {attempt.id} is missing connector_id or credential_id, "
                    f"can't fetch time range."
                )
            last_run_time = get_last_successful_attempt_time(
                attempt.connector_id, attempt.credential_id, db_session
            )
            last_run_time_str = datetime.fromtimestamp(
                last_run_time, tz=timezone.utc
            ).strftime("%Y-%m-%d %H:%M:%S")
            logger.info(
                f"Polling for updates between {last_run_time_str} and {run_time_str}"
            )
            doc_batch_generator = runnable_connector.poll_source(
                start=last_run_time, end=run_time
            )

        else:
            # Event types cannot be handled by a background type
            raise RuntimeError(f"Invalid task type: {task}")

        return doc_batch_generator, run_time

    doc_batch_generator, run_time = _get_document_generator(db_session, index_attempt)

    def _index(
        db_session: Session,
        attempt: IndexAttempt,
        doc_batch_generator: GenerateDocumentsOutput,
        run_time: float,
    ) -> None:
        indexing_pipeline = build_indexing_pipeline()

        run_dt = datetime.fromtimestamp(run_time, tz=timezone.utc)
        db_connector = attempt.connector
        db_credential = attempt.credential

        update_connector_credential_pair(
            db_session=db_session,
            connector_id=db_connector.id,
            credential_id=db_credential.id,
            attempt_status=IndexingStatus.IN_PROGRESS,
            run_dt=run_dt,
        )

        try:
            net_doc_change = 0
            document_count = 0
            chunk_count = 0
            for doc_batch in doc_batch_generator:
                logger.debug(
                    f"Indexing batch of documents: {[doc.to_short_descriptor() for doc in doc_batch]}"
                )

                index_user_id = (
                    None if db_credential.public_doc else db_credential.user_id
                )
                new_docs, total_batch_chunks = indexing_pipeline(
                    documents=doc_batch,
                    index_attempt_metadata=IndexAttemptMetadata(
                        user_id=index_user_id,
                        connector_id=db_connector.id,
                        credential_id=db_credential.id,
                    ),
                )
                net_doc_change += new_docs
                chunk_count += total_batch_chunks
                document_count += len(doc_batch)
                update_docs_indexed(
                    db_session=db_session,
                    index_attempt=attempt,
                    num_docs_indexed=document_count,
                )

                # check if connector is disabled mid run and stop if so
                db_session.refresh(db_connector)
                if db_connector.disabled:
                    # let the `except` block handle this
                    raise RuntimeError("Connector was disabled mid run")

            mark_attempt_succeeded(attempt, db_session)
            update_connector_credential_pair(
                db_session=db_session,
                connector_id=db_connector.id,
                credential_id=db_credential.id,
                attempt_status=IndexingStatus.SUCCESS,
                net_docs=net_doc_change,
                run_dt=run_dt,
            )

            logger.info(
                f"Indexed or updated {document_count} total documents for a total of {chunk_count} chunks"
            )
            logger.info(
                f"Connector successfully finished, elapsed time: {time.time() - run_time} seconds"
            )
        except Exception as e:
            logger.info(
                f"Failed connector elapsed time: {time.time() - run_time} seconds"
            )
            mark_attempt_failed(attempt, db_session, failure_reason=str(e))
            # The last attempt won't be marked failed until the next cycle's check for still in-progress attempts
            # The connector_credential_pair is marked failed here though to reflect correctly in UI asap
            update_connector_credential_pair(
                db_session=db_session,
                connector_id=attempt.connector.id,
                credential_id=attempt.credential.id,
                attempt_status=IndexingStatus.FAILED,
                net_docs=net_doc_change,
                run_dt=run_dt,
            )
            raise e

    _index(db_session, index_attempt, doc_batch_generator, run_time)


def _run_indexing_entrypoint(index_attempt_id: int) -> None:
    """Entrypoint for indexing run when using dask distributed.
    Wraps the actual logic in a `try` block so that we can catch any exceptions
    and mark the attempt as failed."""
    try:
        # set the indexing attempt ID so that all log messages from this process
        # will have it added as a prefix
        IndexAttemptSingleton.set_index_attempt_id(index_attempt_id)

        with Session(get_sqlalchemy_engine()) as db_session:
            attempt = get_index_attempt(
                db_session=db_session, index_attempt_id=index_attempt_id
            )
            if attempt is None:
                raise RuntimeError(
                    f"Unable to find IndexAttempt for ID '{index_attempt_id}'"
                )

            logger.info(
                f"Running indexing attempt for connector: '{attempt.connector.name}', "
                f"with config: '{attempt.connector.connector_specific_config}', and "
                f"with credentials: '{attempt.credential_id}'"
            )
            update_connector_credential_pair(
                db_session=db_session,
                connector_id=attempt.connector.id,
                credential_id=attempt.credential.id,
                attempt_status=IndexingStatus.IN_PROGRESS,
            )

            _run_indexing(
                db_session=db_session,
                index_attempt=attempt,
            )

            logger.info(
                f"Completed indexing attempt for connector: '{attempt.connector.name}', "
                f"with config: '{attempt.connector.connector_specific_config}', and "
                f"with credentials: '{attempt.credential_id}'"
            )
    except Exception as e:
        logger.exception(f"Indexing job with ID '{index_attempt_id}' failed due to {e}")


def kickoff_indexing_jobs(
    db_session: Session,
    existing_jobs: dict[int, Future],
    client: Client,
) -> dict[int, Future]:
    existing_jobs_copy = existing_jobs.copy()

    new_indexing_attempts = get_not_started_index_attempts(db_session)
    logger.info(f"Found {len(new_indexing_attempts)} new indexing tasks.")

    if not new_indexing_attempts:
        return existing_jobs

    for attempt in new_indexing_attempts:
        if attempt.connector is None:
            logger.warning(
                f"Skipping index attempt as Connector has been deleted: {attempt}"
            )
            mark_attempt_failed(attempt, db_session, failure_reason="Connector is null")
            continue
        if attempt.credential is None:
            logger.warning(
                f"Skipping index attempt as Credential has been deleted: {attempt}"
            )
            mark_attempt_failed(
                attempt, db_session, failure_reason="Credential is null"
            )
            continue

        logger.info(
            f"Kicking off indexing attempt for connector: '{attempt.connector.name}', "
            f"with config: '{attempt.connector.connector_specific_config}', and "
            f"with credentials: '{attempt.credential_id}'"
        )
        mark_attempt_in_progress(attempt, db_session)
        run = client.submit(_run_indexing_entrypoint, attempt.id, pure=False)
        existing_jobs_copy[attempt.id] = run

    return existing_jobs_copy


def update_loop(delay: int = 10, num_workers: int = NUM_INDEXING_WORKERS) -> None:
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
    existing_jobs: dict[int, Future] = {}
    engine = get_sqlalchemy_engine()

    with Session(engine) as db_session:
        # Previous version did not always clean up cc-pairs well leaving some connectors undeleteable
        # This ensures that bad states get cleaned up
        mark_all_in_progress_cc_pairs_failed(db_session)

    while True:
        start = time.time()
        start_time_utc = datetime.utcfromtimestamp(start).strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"Running update, current UTC time: {start_time_utc}")
        try:
            with Session(engine, expire_on_commit=False) as db_session:
                existing_jobs = cleanup_indexing_jobs(
                    db_session=db_session, existing_jobs=existing_jobs
                )
                create_indexing_jobs(db_session=db_session, existing_jobs=existing_jobs)
                existing_jobs = kickoff_indexing_jobs(
                    db_session=db_session, existing_jobs=existing_jobs, client=client
                )
        except Exception as e:
            logger.exception(f"Failed to run update due to {e}")
        sleep_time = delay - (time.time() - start)
        if sleep_time > 0:
            time.sleep(sleep_time)


if __name__ == "__main__":
    logger.info("Warming up Embedding Model(s)")
    warm_up_models(indexer_only=True)
    logger.info("Starting Indexing Loop")
    update_loop()
