import time

from danswer.connectors.factory import instantiate_connector
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.models import InputType
from danswer.db.connector import disable_connector
from danswer.db.connector import fetch_connectors
from danswer.db.credentials import backend_update_credential_json
from danswer.db.engine import build_engine
from danswer.db.engine import get_db_current_time
from danswer.db.index_attempt import create_index_attempt
from danswer.db.index_attempt import get_inprogress_index_attempts
from danswer.db.index_attempt import get_last_finished_attempt
from danswer.db.index_attempt import get_not_started_index_attempts
from danswer.db.index_attempt import mark_attempt_failed
from danswer.db.index_attempt import mark_attempt_in_progress
from danswer.db.index_attempt import mark_attempt_succeeded
from danswer.db.models import Connector
from danswer.db.models import IndexAttempt
from danswer.utils.indexing_pipeline import build_indexing_pipeline
from danswer.utils.logging import setup_logger
from sqlalchemy.orm import Session

logger = setup_logger()


def should_create_new_indexing(
    connector: Connector, last_index: IndexAttempt | None, db_session: Session
) -> bool:
    if connector.refresh_freq is None:
        return False
    if not last_index:
        return True
    current_db_time = get_db_current_time(db_session)
    time_since_index = (
        current_db_time - last_index.time_updated
    )  # Maybe better to do time created
    return time_since_index.total_seconds() >= connector.refresh_freq


def create_indexing_jobs(db_session: Session) -> None:
    connectors = fetch_connectors(db_session, disabled_status=False)
    for connector in connectors:
        in_progress_indexing_attempts = get_inprogress_index_attempts(
            connector.id, db_session
        )
        if in_progress_indexing_attempts:
            logger.error("Found incomplete indexing attempts")

        # Currently single threaded so any still in-progress must have errored
        for attempt in in_progress_indexing_attempts:
            mark_attempt_failed(attempt, db_session)

        last_finished_indexing_attempt = get_last_finished_attempt(
            connector.id, db_session
        )
        if not should_create_new_indexing(
            connector, last_finished_indexing_attempt, db_session
        ):
            continue

        for association in connector.credentials:
            credential = association.credential
            create_index_attempt(connector.id, credential.id, db_session)


def run_indexing_jobs(last_run_time: float, db_session: Session) -> None:
    indexing_pipeline = build_indexing_pipeline()

    new_indexing_attempts = get_not_started_index_attempts(db_session)
    logger.info(f"Found {len(new_indexing_attempts)} new indexing tasks.")
    for attempt in new_indexing_attempts:
        logger.info(
            f"Starting new indexing attempt for connector: '{attempt.connector.name}', "
            f"with config: '{attempt.connector.connector_specific_config}', and "
            f" with credentials: '{[c.credential_id for c in attempt.connector.credentials]}'"
        )
        mark_attempt_in_progress(attempt, db_session)

        db_connector = attempt.connector
        db_credential = attempt.credential
        task = db_connector.input_type

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

        try:
            if task == InputType.LOAD_STATE:
                assert isinstance(runnable_connector, LoadConnector)
                doc_batch_generator = runnable_connector.load_from_state()

            elif task == InputType.POLL:
                assert isinstance(runnable_connector, PollConnector)
                doc_batch_generator = runnable_connector.poll_source(
                    last_run_time, time.time()
                )

            else:
                # Event types cannot be handled by a background type, leave these untouched
                continue

            document_ids: list[str] = []
            for doc_batch in doc_batch_generator:
                index_user_id = (
                    None if db_credential.public_doc else db_credential.user_id
                )
                indexing_pipeline(documents=doc_batch, user_id=index_user_id)
                document_ids.extend([doc.id for doc in doc_batch])

            mark_attempt_succeeded(attempt, document_ids, db_session)

        except Exception as e:
            logger.exception(f"Indexing job with id {attempt.id} failed due to {e}")
            mark_attempt_failed(attempt, db_session, failure_reason=str(e))


def update_loop(delay: int = 10) -> None:
    last_run_time = 0.0
    while True:
        start = time.time()
        logger.info(f"Running update, current time: {time.ctime(start)}")
        try:
            with Session(
                build_engine(), future=True, expire_on_commit=False
            ) as db_session:
                create_indexing_jobs(db_session)
                # TODO failed poll jobs won't recover data from failed runs, should fix
                run_indexing_jobs(last_run_time, db_session)
        except Exception as e:
            logger.exception(f"Failed to run update due to {e}")
        sleep_time = delay - (time.time() - start)
        if sleep_time > 0:
            time.sleep(sleep_time)


if __name__ == "__main__":
    update_loop()
