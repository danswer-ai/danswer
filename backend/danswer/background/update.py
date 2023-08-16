import time
from datetime import datetime
from datetime import timezone

from sqlalchemy.orm import Session

from danswer.connectors.factory import instantiate_connector
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.models import IndexAttemptMetadata
from danswer.connectors.models import InputType
from danswer.datastores.indexing_pipeline import build_indexing_pipeline
from danswer.db.connector import disable_connector
from danswer.db.connector import fetch_connectors
from danswer.db.connector_credential_pair import get_last_successful_attempt_time
from danswer.db.connector_credential_pair import update_connector_credential_pair
from danswer.db.credentials import backend_update_credential_json
from danswer.db.engine import get_db_current_time
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.index_attempt import create_index_attempt
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
from danswer.utils.logger import setup_logger

logger = setup_logger()


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


def create_indexing_jobs(db_session: Session) -> None:
    connectors = fetch_connectors(db_session)

    # clean up in-progress jobs that were never completed
    for connector in connectors:
        in_progress_indexing_attempts = get_inprogress_index_attempts(
            connector.id, db_session
        )
        if in_progress_indexing_attempts:
            logger.error("Found incomplete indexing attempts")

        # Currently single threaded so any still in-progress must have errored
        for attempt in in_progress_indexing_attempts:
            logger.warning(
                f"Marking in-progress attempt 'connector: {attempt.connector_id}, "
                f"credential: {attempt.credential_id}' as failed"
            )
            mark_attempt_failed(
                attempt,
                db_session,
                failure_reason="Stopped mid run, likely due to the background process being killed",
            )
            if attempt.connector_id and attempt.credential_id:
                update_connector_credential_pair(
                    connector_id=attempt.connector_id,
                    credential_id=attempt.credential_id,
                    attempt_status=IndexingStatus.FAILED,
                    net_docs=None,
                    run_dt=None,
                    db_session=db_session,
                )

    # potentially kick off new runs
    enabled_connectors = [
        connector for connector in connectors if not connector.disabled
    ]
    for connector in enabled_connectors:
        for association in connector.credentials:
            credential = association.credential

            last_attempt = get_last_attempt(connector.id, credential.id, db_session)
            if not should_create_new_indexing(connector, last_attempt, db_session):
                continue
            create_index_attempt(connector.id, credential.id, db_session)

            update_connector_credential_pair(
                connector_id=connector.id,
                credential_id=credential.id,
                attempt_status=IndexingStatus.NOT_STARTED,
                net_docs=None,
                run_dt=None,
                db_session=db_session,
            )


def run_indexing_jobs(db_session: Session) -> None:
    indexing_pipeline = build_indexing_pipeline()

    new_indexing_attempts = get_not_started_index_attempts(db_session)
    logger.info(f"Found {len(new_indexing_attempts)} new indexing tasks.")
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
            f"Starting new indexing attempt for connector: '{attempt.connector.name}', "
            f"with config: '{attempt.connector.connector_specific_config}', and "
            f"with credentials: '{attempt.credential_id}'"
        )

        # "official" timestamp for this run
        # used for setting time bounds when fetching updates from apps and
        # is stored in the DB as the last successful run time if this run succeeds
        run_time = time.time()
        run_dt = datetime.fromtimestamp(run_time, tz=timezone.utc)
        run_time_str = run_dt.strftime("%Y-%m-%d %H:%M:%S")

        mark_attempt_in_progress(attempt, db_session)

        db_connector = attempt.connector
        db_credential = attempt.credential
        task = db_connector.input_type

        update_connector_credential_pair(
            connector_id=db_connector.id,
            credential_id=db_credential.id,
            attempt_status=IndexingStatus.IN_PROGRESS,
            net_docs=None,
            run_dt=None,
            db_session=db_session,
        )

        try:
            runnable_connector, new_credential_json = instantiate_connector(
                db_connector.source,
                task,
                db_connector.connector_specific_config,
                db_credential.credential_json,
            )
            if new_credential_json is not None:
                backend_update_credential_json(
                    db_credential, new_credential_json, db_session
                )
        except Exception as e:
            logger.exception(f"Unable to instantiate connector due to {e}")
            disable_connector(db_connector.id, db_session)
            continue

        net_doc_change = 0
        try:
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
                # Event types cannot be handled by a background type, leave these untouched
                continue

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
                connector_id=db_connector.id,
                credential_id=db_credential.id,
                attempt_status=IndexingStatus.SUCCESS,
                net_docs=net_doc_change,
                run_dt=run_dt,
                db_session=db_session,
            )

            logger.info(
                f"Indexed or updated {document_count} total documents for a total of {chunk_count} chunks"
            )
            logger.info(
                f"Connector successfully finished, elapsed time: {time.time() - run_time} seconds"
            )

        except Exception as e:
            logger.exception(f"Indexing job with id {attempt.id} failed due to {e}")
            logger.info(
                f"Failed connector elapsed time: {time.time() - run_time} seconds"
            )
            mark_attempt_failed(attempt, db_session, failure_reason=str(e))
            update_connector_credential_pair(
                connector_id=db_connector.id,
                credential_id=db_credential.id,
                attempt_status=IndexingStatus.FAILED,
                net_docs=net_doc_change,
                run_dt=run_dt,
                db_session=db_session,
            )


def update_loop(delay: int = 10) -> None:
    engine = get_sqlalchemy_engine()
    while True:
        start = time.time()
        start_time_utc = datetime.utcfromtimestamp(start).strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"Running update, current UTC time: {start_time_utc}")
        try:
            with Session(engine, expire_on_commit=False) as db_session:
                create_indexing_jobs(db_session)
                run_indexing_jobs(db_session)
        except Exception as e:
            logger.exception(f"Failed to run update due to {e}")
        sleep_time = delay - (time.time() - start)
        if sleep_time > 0:
            time.sleep(sleep_time)


if __name__ == "__main__":
    update_loop()
