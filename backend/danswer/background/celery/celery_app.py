import json
import logging
import traceback
from datetime import timedelta
from typing import Any
from typing import cast

import redis
from celery import Celery
from celery import current_task
from celery import signals
from celery import Task
from celery.contrib.abortable import AbortableTask  # type: ignore
from celery.exceptions import SoftTimeLimitExceeded
from celery.exceptions import TaskRevokedError
from celery.signals import beat_init
from celery.signals import worker_init
from celery.states import READY_STATES
from celery.utils.log import get_task_logger
from redis import Redis
from sqlalchemy import inspect
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import ObjectDeletedError

from danswer.access.access import get_access_for_document
from danswer.background.celery.celery_redis import RedisConnectorCredentialPair
from danswer.background.celery.celery_redis import RedisConnectorDeletion
from danswer.background.celery.celery_redis import RedisDocumentSet
from danswer.background.celery.celery_redis import RedisUserGroup
from danswer.background.celery.celery_utils import extract_ids_from_runnable_connector
from danswer.background.celery.celery_utils import should_prune_cc_pair
from danswer.background.connector_deletion import delete_connector_credential_pair_batch
from danswer.background.task_utils import build_celery_task_wrapper
from danswer.background.task_utils import name_cc_prune_task
from danswer.configs.app_configs import JOB_TIMEOUT
from danswer.configs.constants import CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT
from danswer.configs.constants import DanswerCeleryPriority
from danswer.configs.constants import DanswerRedisLocks
from danswer.configs.constants import POSTGRES_CELERY_BEAT_APP_NAME
from danswer.configs.constants import POSTGRES_CELERY_WORKER_APP_NAME
from danswer.configs.constants import PostgresAdvisoryLocks
from danswer.connectors.factory import instantiate_connector
from danswer.connectors.models import InputType
from danswer.db.connector import fetch_connector_by_id
from danswer.db.connector_credential_pair import add_deletion_failure_message
from danswer.db.connector_credential_pair import (
    delete_connector_credential_pair__no_commit,
)
from danswer.db.connector_credential_pair import get_connector_credential_pair
from danswer.db.connector_credential_pair import get_connector_credential_pair_from_id
from danswer.db.connector_credential_pair import get_connector_credential_pairs
from danswer.db.document import count_documents_by_needs_sync
from danswer.db.document import delete_document_by_connector_credential_pair__no_commit
from danswer.db.document import delete_documents_complete__no_commit
from danswer.db.document import get_document
from danswer.db.document import get_document_connector_count
from danswer.db.document import get_documents_for_connector_credential_pair
from danswer.db.document import mark_document_as_synced
from danswer.db.document_set import delete_document_set
from danswer.db.document_set import delete_document_set_cc_pair_relationship__no_commit
from danswer.db.document_set import fetch_document_sets
from danswer.db.document_set import fetch_document_sets_for_document
from danswer.db.document_set import get_document_set_by_id
from danswer.db.document_set import mark_document_set_as_synced
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.engine import init_sqlalchemy_engine
from danswer.db.enums import ConnectorCredentialPairStatus
from danswer.db.enums import IndexingStatus
from danswer.db.index_attempt import delete_index_attempts
from danswer.db.index_attempt import get_last_attempt
from danswer.db.models import ConnectorCredentialPair
from danswer.db.models import DocumentSet
from danswer.db.models import UserGroup
from danswer.db.search_settings import get_current_search_settings
from danswer.document_index.document_index_utils import get_both_index_names
from danswer.document_index.factory import get_default_document_index
from danswer.document_index.interfaces import UpdateRequest
from danswer.redis.redis_pool import RedisPool
from danswer.server.documents.models import ConnectorCredentialPairIdentifier
from danswer.utils.logger import ColoredFormatter
from danswer.utils.logger import PlainFormatter
from danswer.utils.logger import setup_logger
from danswer.utils.variable_functionality import fetch_versioned_implementation
from danswer.utils.variable_functionality import (
    fetch_versioned_implementation_with_fallback,
)
from danswer.utils.variable_functionality import noop_fallback

logger = setup_logger()

# use this within celery tasks to get celery task specific logging
task_logger = get_task_logger(__name__)

redis_pool = RedisPool()

celery_app = Celery(__name__)
celery_app.config_from_object(
    "danswer.background.celery.celeryconfig"
)  # Load configuration from 'celeryconfig.py'


#####
# Tasks that need to be run in job queue, registered via APIs
#
# If imports from this module are needed, use local imports to avoid circular importing
#####


@build_celery_task_wrapper(name_cc_prune_task)
@celery_app.task(soft_time_limit=JOB_TIMEOUT)
def prune_documents_task(connector_id: int, credential_id: int) -> None:
    """connector pruning task. For a cc pair, this task pulls all document IDs from the source
    and compares those IDs to locally stored documents and deletes all locally stored IDs missing
    from the most recently pulled document ID list"""
    with Session(get_sqlalchemy_engine()) as db_session:
        try:
            cc_pair = get_connector_credential_pair(
                db_session=db_session,
                connector_id=connector_id,
                credential_id=credential_id,
            )

            if not cc_pair:
                task_logger.warning(
                    f"ccpair not found for {connector_id} {credential_id}"
                )
                return

            runnable_connector = instantiate_connector(
                db_session=db_session,
                source=cc_pair.connector.source,
                input_type=InputType.PRUNE,
                connector_specific_config=cc_pair.connector.connector_specific_config,
                credential=cc_pair.credential,
            )

            all_connector_doc_ids: set[str] = extract_ids_from_runnable_connector(
                runnable_connector
            )

            all_indexed_document_ids = {
                doc.id
                for doc in get_documents_for_connector_credential_pair(
                    db_session=db_session,
                    connector_id=connector_id,
                    credential_id=credential_id,
                )
            }

            doc_ids_to_remove = list(all_indexed_document_ids - all_connector_doc_ids)

            curr_ind_name, sec_ind_name = get_both_index_names(db_session)
            document_index = get_default_document_index(
                primary_index_name=curr_ind_name, secondary_index_name=sec_ind_name
            )

            if len(doc_ids_to_remove) == 0:
                task_logger.info(
                    f"No docs to prune from {cc_pair.connector.source} connector"
                )
                return

            task_logger.info(
                f"pruning {len(doc_ids_to_remove)} doc(s) from {cc_pair.connector.source} connector"
            )
            delete_connector_credential_pair_batch(
                document_ids=doc_ids_to_remove,
                connector_id=connector_id,
                credential_id=credential_id,
                document_index=document_index,
            )
        except Exception as e:
            task_logger.exception(
                f"Failed to run pruning for connector id {connector_id}."
            )
            raise e


def try_generate_stale_document_sync_tasks(
    db_session: Session, r: Redis, lock_beat: redis.lock.Lock
) -> int | None:
    """This picks up stale documents (typically from indexing) and queues them for sync to Vespa.

    Returns an int if syncing is needed. The int represents the number of sync tasks generated.
    Returns None if no syncing is required.
    """
    # the fence is up, do nothing
    if r.exists(RedisConnectorCredentialPair.get_fence_key()):
        return None

    r.delete(RedisConnectorCredentialPair.get_taskset_key())  # delete the taskset

    # add tasks to celery and build up the task set to monitor in redis
    stale_doc_count = count_documents_by_needs_sync(db_session)
    if stale_doc_count == 0:
        return None

    task_logger.info(
        f"Stale documents found (at least {stale_doc_count}). Generating sync tasks by cc pair."
    )

    task_logger.info("RedisConnector.generate_tasks starting by cc_pair.")

    # rkuo: we could technically sync all stale docs in one big pass.
    # but I feel it's more understandable to group the docs by cc_pair
    total_tasks_generated = 0
    cc_pairs = get_connector_credential_pairs(db_session)
    for cc_pair in cc_pairs:
        rc = RedisConnectorCredentialPair(cc_pair.id)
        tasks_generated = rc.generate_tasks(celery_app, db_session, r, lock_beat)

        if tasks_generated is None:
            continue

        if tasks_generated == 0:
            continue

        task_logger.info(
            f"RedisConnector.generate_tasks finished. "
            f"cc_pair_id={cc_pair.id} tasks_generated={tasks_generated}"
        )

        total_tasks_generated += tasks_generated

    task_logger.info(
        f"RedisConnector.generate_tasks finished for all cc_pairs. total_tasks_generated={total_tasks_generated}"
    )

    r.set(RedisConnectorCredentialPair.get_fence_key(), total_tasks_generated)
    return total_tasks_generated


def try_generate_document_set_sync_tasks(
    document_set: DocumentSet, db_session: Session, r: Redis, lock_beat: redis.lock.Lock
) -> int | None:
    """Returns an int if syncing is needed. The int represents the number of sync tasks generated.
    Note that syncing can still be required even if the number of sync tasks generated is zero.
    Returns None if no syncing is required.
    """
    lock_beat.reacquire()

    rds = RedisDocumentSet(document_set.id)

    # don't generate document set sync tasks if tasks are still pending
    if r.exists(rds.fence_key):
        return None

    # don't generate sync tasks if we're up to date
    # race condition with the monitor/cleanup function if we use a cached result!
    db_session.refresh(document_set)
    if document_set.is_up_to_date:
        return None

    # add tasks to celery and build up the task set to monitor in redis
    r.delete(rds.taskset_key)

    task_logger.info(
        f"RedisDocumentSet.generate_tasks starting. document_set_id={document_set.id}"
    )

    # Add all documents that need to be updated into the queue
    tasks_generated = rds.generate_tasks(celery_app, db_session, r, lock_beat)
    if tasks_generated is None:
        return None

    # Currently we are allowing the sync to proceed with 0 tasks.
    # It's possible for sets/groups to be generated initially with no entries
    # and they still need to be marked as up to date.
    # if tasks_generated == 0:
    #     return 0

    task_logger.info(
        f"RedisDocumentSet.generate_tasks finished. "
        f"document_set_id={document_set.id} tasks_generated={tasks_generated}"
    )

    # set this only after all tasks have been added
    r.set(rds.fence_key, tasks_generated)
    return tasks_generated


def try_generate_user_group_sync_tasks(
    usergroup: UserGroup, db_session: Session, r: Redis, lock_beat: redis.lock.Lock
) -> int | None:
    """Returns an int if syncing is needed. The int represents the number of sync tasks generated.
    Note that syncing can still be required even if the number of sync tasks generated is zero.
    Returns None if no syncing is required.
    """
    lock_beat.reacquire()

    rug = RedisUserGroup(usergroup.id)

    # don't generate sync tasks if tasks are still pending
    if r.exists(rug.fence_key):
        return None

    # race condition with the monitor/cleanup function if we use a cached result!
    db_session.refresh(usergroup)
    if usergroup.is_up_to_date:
        return None

    # add tasks to celery and build up the task set to monitor in redis
    r.delete(rug.taskset_key)

    # Add all documents that need to be updated into the queue
    task_logger.info(
        f"RedisUserGroup.generate_tasks starting. usergroup_id={usergroup.id}"
    )
    tasks_generated = rug.generate_tasks(celery_app, db_session, r, lock_beat)
    if tasks_generated is None:
        return None

    # Currently we are allowing the sync to proceed with 0 tasks.
    # It's possible for sets/groups to be generated initially with no entries
    # and they still need to be marked as up to date.
    # if tasks_generated == 0:
    #     return 0

    task_logger.info(
        f"RedisUserGroup.generate_tasks finished. "
        f"usergroup_id={usergroup.id} tasks_generated={tasks_generated}"
    )

    # set this only after all tasks have been added
    r.set(rug.fence_key, tasks_generated)
    return tasks_generated


def try_generate_document_cc_pair_cleanup_tasks(
    cc_pair: ConnectorCredentialPair,
    db_session: Session,
    r: Redis,
    lock_beat: redis.lock.Lock,
) -> int | None:
    """Returns an int if syncing is needed. The int represents the number of sync tasks generated.
    Note that syncing can still be required even if the number of sync tasks generated is zero.
    Returns None if no syncing is required.
    """

    lock_beat.reacquire()

    rcd = RedisConnectorDeletion(cc_pair.id)

    # don't generate sync tasks if tasks are still pending
    if r.exists(rcd.fence_key):
        return None

    # we need to refresh the state of the object inside the fence
    # to avoid a race condition with db.commit/fence deletion
    # at the end of this taskset
    try:
        db_session.refresh(cc_pair)
    except ObjectDeletedError:
        return None

    if cc_pair.status != ConnectorCredentialPairStatus.DELETING:
        return None

    search_settings = get_current_search_settings(db_session)

    last_indexing = get_last_attempt(
        connector_id=cc_pair.connector_id,
        credential_id=cc_pair.credential_id,
        search_settings_id=search_settings.id,
        db_session=db_session,
    )
    if last_indexing:
        if (
            last_indexing.status == IndexingStatus.IN_PROGRESS
            or last_indexing.status == IndexingStatus.NOT_STARTED
        ):
            return None

    # add tasks to celery and build up the task set to monitor in redis
    r.delete(rcd.taskset_key)

    # Add all documents that need to be updated into the queue
    task_logger.info(
        f"RedisConnectorDeletion.generate_tasks starting. cc_pair_id={cc_pair.id}"
    )
    tasks_generated = rcd.generate_tasks(celery_app, db_session, r, lock_beat)
    if tasks_generated is None:
        return None

    # Currently we are allowing the sync to proceed with 0 tasks.
    # It's possible for sets/groups to be generated initially with no entries
    # and they still need to be marked as up to date.
    # if tasks_generated == 0:
    #     return 0

    task_logger.info(
        f"RedisConnectorDeletion.generate_tasks finished. "
        f"cc_pair_id={cc_pair.id} tasks_generated={tasks_generated}"
    )

    # set this only after all tasks have been added
    r.set(rcd.fence_key, tasks_generated)
    return tasks_generated


#####
# Periodic Tasks
#####
@celery_app.task(
    name="check_for_vespa_sync_task",
    soft_time_limit=JOB_TIMEOUT,
)
def check_for_vespa_sync_task() -> None:
    """Runs periodically to check if any document needs syncing.
    Generates sets of tasks for Celery if syncing is needed."""

    r = redis_pool.get_client()

    lock_beat = r.lock(
        DanswerRedisLocks.CHECK_VESPA_SYNC_BEAT_LOCK,
        timeout=CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT,
    )

    try:
        # these tasks should never overlap
        if not lock_beat.acquire(blocking=False):
            return

        with Session(get_sqlalchemy_engine()) as db_session:
            try_generate_stale_document_sync_tasks(db_session, r, lock_beat)

            # check if any document sets are not synced
            document_set_info = fetch_document_sets(
                user_id=None, db_session=db_session, include_outdated=True
            )
            for document_set, _ in document_set_info:
                try_generate_document_set_sync_tasks(
                    document_set, db_session, r, lock_beat
                )

            # check if any user groups are not synced
            try:
                fetch_user_groups = fetch_versioned_implementation(
                    "danswer.db.user_group", "fetch_user_groups"
                )

                user_groups = fetch_user_groups(
                    db_session=db_session, only_up_to_date=False
                )
                for usergroup in user_groups:
                    try_generate_user_group_sync_tasks(
                        usergroup, db_session, r, lock_beat
                    )
            except ModuleNotFoundError:
                # Always exceptions on the MIT version, which is expected
                pass
    except SoftTimeLimitExceeded:
        task_logger.info(
            "Soft time limit exceeded, task is being terminated gracefully."
        )
    except Exception:
        task_logger.exception("Unexpected exception")
    finally:
        if lock_beat.owned():
            lock_beat.release()


@celery_app.task(
    name="check_for_connector_deletion_task",
    soft_time_limit=JOB_TIMEOUT,
)
def check_for_connector_deletion_task() -> None:
    r = redis_pool.get_client()

    lock_beat = r.lock(
        DanswerRedisLocks.CHECK_CONNECTOR_DELETION_BEAT_LOCK,
        timeout=CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT,
    )

    try:
        # these tasks should never overlap
        if not lock_beat.acquire(blocking=False):
            return

        with Session(get_sqlalchemy_engine()) as db_session:
            cc_pairs = get_connector_credential_pairs(db_session)
            for cc_pair in cc_pairs:
                try_generate_document_cc_pair_cleanup_tasks(
                    cc_pair, db_session, r, lock_beat
                )
    except SoftTimeLimitExceeded:
        task_logger.info(
            "Soft time limit exceeded, task is being terminated gracefully."
        )
    except Exception:
        task_logger.exception("Unexpected exception")
    finally:
        if lock_beat.owned():
            lock_beat.release()


@celery_app.task(
    name="kombu_message_cleanup_task",
    soft_time_limit=JOB_TIMEOUT,
    bind=True,
    base=AbortableTask,
)
def kombu_message_cleanup_task(self: Any) -> int:
    """Runs periodically to clean up the kombu_message table"""

    # we will select messages older than this amount to clean up
    KOMBU_MESSAGE_CLEANUP_AGE = 7  # days
    KOMBU_MESSAGE_CLEANUP_PAGE_LIMIT = 1000

    ctx = {}
    ctx["last_processed_id"] = 0
    ctx["deleted"] = 0
    ctx["cleanup_age"] = KOMBU_MESSAGE_CLEANUP_AGE
    ctx["page_limit"] = KOMBU_MESSAGE_CLEANUP_PAGE_LIMIT
    with Session(get_sqlalchemy_engine()) as db_session:
        # Exit the task if we can't take the advisory lock
        result = db_session.execute(
            text("SELECT pg_try_advisory_lock(:id)"),
            {"id": PostgresAdvisoryLocks.KOMBU_MESSAGE_CLEANUP_LOCK_ID.value},
        ).scalar()
        if not result:
            return 0

        while True:
            if self.is_aborted():
                raise TaskRevokedError("kombu_message_cleanup_task was aborted.")

            b = kombu_message_cleanup_task_helper(ctx, db_session)
            if not b:
                break

            db_session.commit()

    if ctx["deleted"] > 0:
        task_logger.info(
            f"Deleted {ctx['deleted']} orphaned messages from kombu_message."
        )

    return ctx["deleted"]


def kombu_message_cleanup_task_helper(ctx: dict, db_session: Session) -> bool:
    """
    Helper function to clean up old messages from the `kombu_message` table that are no longer relevant.

    This function retrieves messages from the `kombu_message` table that are no longer visible and
    older than a specified interval. It checks if the corresponding task_id exists in the
    `celery_taskmeta` table. If the task_id does not exist, the message is deleted.

    Args:
        ctx (dict): A context dictionary containing configuration parameters such as:
            - 'cleanup_age' (int): The age in days after which messages are considered old.
            - 'page_limit' (int): The maximum number of messages to process in one batch.
            - 'last_processed_id' (int): The ID of the last processed message to handle pagination.
            - 'deleted' (int): A counter to track the number of deleted messages.
        db_session (Session): The SQLAlchemy database session for executing queries.

    Returns:
        bool: Returns True if there are more rows to process, False if not.
    """

    inspector = inspect(db_session.bind)
    if not inspector:
        return False

    # With the move to redis as celery's broker and backend, kombu tables may not even exist.
    # We can fail silently.
    if not inspector.has_table("kombu_message"):
        return False

    query = text(
        """
    SELECT id, timestamp, payload
    FROM kombu_message WHERE visible = 'false'
    AND timestamp < CURRENT_TIMESTAMP - INTERVAL :interval_days
    AND id > :last_processed_id
    ORDER BY id
    LIMIT :page_limit
"""
    )
    kombu_messages = db_session.execute(
        query,
        {
            "interval_days": f"{ctx['cleanup_age']} days",
            "page_limit": ctx["page_limit"],
            "last_processed_id": ctx["last_processed_id"],
        },
    ).fetchall()

    if len(kombu_messages) == 0:
        return False

    for msg in kombu_messages:
        payload = json.loads(msg[2])
        task_id = payload["headers"]["id"]

        # Check if task_id exists in celery_taskmeta
        task_exists = db_session.execute(
            text("SELECT 1 FROM celery_taskmeta WHERE task_id = :task_id"),
            {"task_id": task_id},
        ).fetchone()

        # If task_id does not exist, delete the message
        if not task_exists:
            result = db_session.execute(
                text("DELETE FROM kombu_message WHERE id = :message_id"),
                {"message_id": msg[0]},
            )
            if result.rowcount > 0:  # type: ignore
                ctx["deleted"] += 1

        ctx["last_processed_id"] = msg[0]

    return True


@celery_app.task(
    name="check_for_prune_task",
    soft_time_limit=JOB_TIMEOUT,
)
def check_for_prune_task() -> None:
    """Runs periodically to check if any prune tasks should be run and adds them
    to the queue"""

    with Session(get_sqlalchemy_engine()) as db_session:
        all_cc_pairs = get_connector_credential_pairs(db_session)

        for cc_pair in all_cc_pairs:
            if should_prune_cc_pair(
                connector=cc_pair.connector,
                credential=cc_pair.credential,
                db_session=db_session,
            ):
                task_logger.info(f"Pruning the {cc_pair.connector.name} connector")

                prune_documents_task.apply_async(
                    kwargs=dict(
                        connector_id=cc_pair.connector.id,
                        credential_id=cc_pair.credential.id,
                    )
                )


@celery_app.task(
    name="vespa_metadata_sync_task",
    bind=True,
    soft_time_limit=45,
    time_limit=60,
    max_retries=3,
)
def vespa_metadata_sync_task(self: Task, document_id: str) -> bool:
    task_logger.info(f"document_id={document_id}")

    try:
        with Session(get_sqlalchemy_engine()) as db_session:
            curr_ind_name, sec_ind_name = get_both_index_names(db_session)
            document_index = get_default_document_index(
                primary_index_name=curr_ind_name, secondary_index_name=sec_ind_name
            )

            doc = get_document(document_id, db_session)
            if not doc:
                return False

            # document set sync
            doc_sets = fetch_document_sets_for_document(document_id, db_session)
            update_doc_sets: set[str] = set(doc_sets)

            # User group sync
            doc_access = get_access_for_document(
                document_id=document_id, db_session=db_session
            )
            update_request = UpdateRequest(
                document_ids=[document_id],
                document_sets=update_doc_sets,
                access=doc_access,
                boost=doc.boost,
                hidden=doc.hidden,
            )

            # update Vespa. OK if doc doesn't exist. Raises exception otherwise.
            document_index.update_single(update_request=update_request)

            # update db last. Worst case = we crash right before this and
            # the sync might repeat again later
            mark_document_as_synced(document_id, db_session)
    except SoftTimeLimitExceeded:
        task_logger.info(f"SoftTimeLimitExceeded exception. doc_id={document_id}")
    except Exception as e:
        task_logger.exception("Unexpected exception")

        # Exponential backoff from 2^4 to 2^6 ... i.e. 16, 32, 64
        countdown = 2 ** (self.request.retries + 4)
        self.retry(exc=e, countdown=countdown)

    return True


@celery_app.task(
    name="document_by_cc_pair_cleanup_task",
    bind=True,
    soft_time_limit=45,
    time_limit=60,
    max_retries=3,
)
def document_by_cc_pair_cleanup_task(
    self: Task, document_id: str, connector_id: int, credential_id: int
) -> bool:
    task_logger.info(f"document_id={document_id}")

    try:
        with Session(get_sqlalchemy_engine()) as db_session:
            curr_ind_name, sec_ind_name = get_both_index_names(db_session)
            document_index = get_default_document_index(
                primary_index_name=curr_ind_name, secondary_index_name=sec_ind_name
            )

            count = get_document_connector_count(db_session, document_id)
            if count == 1:
                # count == 1 means this is the only remaining cc_pair reference to the doc
                # delete it from vespa and the db
                document_index.delete(doc_ids=[document_id])
                delete_documents_complete__no_commit(
                    db_session=db_session,
                    document_ids=[document_id],
                )
            elif count > 1:
                # count > 1 means the document still has cc_pair references
                doc = get_document(document_id, db_session)
                if not doc:
                    return False

                # the below functions do not include cc_pairs being deleted.
                # i.e. they will correctly omit access for the current cc_pair
                doc_access = get_access_for_document(
                    document_id=document_id, db_session=db_session
                )

                doc_sets = fetch_document_sets_for_document(document_id, db_session)
                update_doc_sets: set[str] = set(doc_sets)

                update_request = UpdateRequest(
                    document_ids=[document_id],
                    document_sets=update_doc_sets,
                    access=doc_access,
                    boost=doc.boost,
                    hidden=doc.hidden,
                )

                # update Vespa. OK if doc doesn't exist. Raises exception otherwise.
                document_index.update_single(update_request=update_request)

                # there are still other cc_pair references to the doc, so just resync to Vespa
                delete_document_by_connector_credential_pair__no_commit(
                    db_session=db_session,
                    document_id=document_id,
                    connector_credential_pair_identifier=ConnectorCredentialPairIdentifier(
                        connector_id=connector_id,
                        credential_id=credential_id,
                    ),
                )

                mark_document_as_synced(document_id, db_session)
            else:
                pass

            # update_docs_last_modified__no_commit(
            #     db_session=db_session,
            #     document_ids=[document_id],
            # )

            db_session.commit()
    except SoftTimeLimitExceeded:
        task_logger.info(f"SoftTimeLimitExceeded exception. doc_id={document_id}")
    except Exception as e:
        task_logger.exception("Unexpected exception")

        # Exponential backoff from 2^4 to 2^6 ... i.e. 16, 32, 64
        countdown = 2 ** (self.request.retries + 4)
        self.retry(exc=e, countdown=countdown)

    return True


@signals.task_postrun.connect
def celery_task_postrun(
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
    """
    if not task:
        return

    task_logger.debug(f"Task {task.name} (ID: {task_id}) completed with state: {state}")
    # logger.debug(f"Result: {retval}")

    if state not in READY_STATES:
        return

    if not task_id:
        return

    if task_id.startswith(RedisConnectorCredentialPair.PREFIX):
        r = redis_pool.get_client()
        r.srem(RedisConnectorCredentialPair.get_taskset_key(), task_id)
        return

    if task_id.startswith(RedisDocumentSet.PREFIX):
        r = redis_pool.get_client()
        document_set_id = RedisDocumentSet.get_id_from_task_id(task_id)
        if document_set_id is not None:
            rds = RedisDocumentSet(document_set_id)
            r.srem(rds.taskset_key, task_id)
        return

    if task_id.startswith(RedisUserGroup.PREFIX):
        r = redis_pool.get_client()
        usergroup_id = RedisUserGroup.get_id_from_task_id(task_id)
        if usergroup_id is not None:
            rug = RedisUserGroup(usergroup_id)
            r.srem(rug.taskset_key, task_id)
        return

    if task_id.startswith(RedisConnectorDeletion.PREFIX):
        r = redis_pool.get_client()
        cc_pair_id = RedisConnectorDeletion.get_id_from_task_id(task_id)
        if cc_pair_id is not None:
            rcd = RedisConnectorDeletion(cc_pair_id)
            r.srem(rcd.taskset_key, task_id)
        return


def monitor_connector_taskset(r: Redis) -> None:
    fence_value = r.get(RedisConnectorCredentialPair.get_fence_key())
    if fence_value is None:
        return

    try:
        initial_count = int(cast(int, fence_value))
    except ValueError:
        task_logger.error("The value is not an integer.")
        return

    count = r.scard(RedisConnectorCredentialPair.get_taskset_key())
    task_logger.info(f"Stale documents: remaining={count} initial={initial_count}")
    if count == 0:
        r.delete(RedisConnectorCredentialPair.get_taskset_key())
        r.delete(RedisConnectorCredentialPair.get_fence_key())
        task_logger.info(f"Successfully synced stale documents. count={initial_count}")


def monitor_document_set_taskset(key_bytes: bytes, r: Redis) -> None:
    fence_key = key_bytes.decode("utf-8")
    document_set_id = RedisDocumentSet.get_id_from_fence_key(fence_key)
    if document_set_id is None:
        task_logger.warning("could not parse document set id from {key}")
        return

    rds = RedisDocumentSet(document_set_id)

    fence_value = r.get(rds.fence_key)
    if fence_value is None:
        return

    try:
        initial_count = int(cast(int, fence_value))
    except ValueError:
        task_logger.error("The value is not an integer.")
        return

    count = cast(int, r.scard(rds.taskset_key))
    task_logger.info(
        f"Document set sync: document_set_id={document_set_id} remaining={count} initial={initial_count}"
    )
    if count > 0:
        return

    with Session(get_sqlalchemy_engine()) as db_session:
        document_set = cast(
            DocumentSet,
            get_document_set_by_id(
                db_session=db_session, document_set_id=document_set_id
            ),
        )  # casting since we "know" a document set with this ID exists
        if document_set:
            if not document_set.connector_credential_pairs:
                # if there are no connectors, then delete the document set.
                delete_document_set(
                    document_set_row=document_set, db_session=db_session
                )
                task_logger.info(
                    f"Successfully deleted document set with ID: '{document_set_id}'!"
                )
            else:
                mark_document_set_as_synced(document_set_id, db_session)
                task_logger.info(
                    f"Successfully synced document set with ID: '{document_set_id}'!"
                )

    r.delete(rds.taskset_key)
    r.delete(rds.fence_key)


def monitor_connector_deletion_taskset(key_bytes: bytes, r: Redis) -> None:
    fence_key = key_bytes.decode("utf-8")
    cc_pair_id = RedisConnectorDeletion.get_id_from_fence_key(fence_key)
    if cc_pair_id is None:
        task_logger.warning("could not parse document set id from {key}")
        return

    rcd = RedisConnectorDeletion(cc_pair_id)

    fence_value = r.get(rcd.fence_key)
    if fence_value is None:
        return

    try:
        initial_count = int(cast(int, fence_value))
    except ValueError:
        task_logger.error("The value is not an integer.")
        return

    count = cast(int, r.scard(rcd.taskset_key))
    task_logger.info(
        f"Connector deletion: cc_pair_id={cc_pair_id} remaining={count} initial={initial_count}"
    )
    if count > 0:
        return

    with Session(get_sqlalchemy_engine()) as db_session:
        cc_pair = get_connector_credential_pair_from_id(cc_pair_id, db_session)
        if not cc_pair:
            return

        try:
            # clean up the rest of the related Postgres entities
            # index attempts
            delete_index_attempts(
                db_session=db_session,
                cc_pair_id=cc_pair.id,
            )

            # document sets
            delete_document_set_cc_pair_relationship__no_commit(
                db_session=db_session,
                connector_id=cc_pair.connector_id,
                credential_id=cc_pair.credential_id,
            )

            # user groups
            cleanup_user_groups = fetch_versioned_implementation_with_fallback(
                "danswer.db.user_group",
                "delete_user_group_cc_pair_relationship__no_commit",
                noop_fallback,
            )
            cleanup_user_groups(
                cc_pair_id=cc_pair.id,
                db_session=db_session,
            )

            # finally, delete the cc-pair
            delete_connector_credential_pair__no_commit(
                db_session=db_session,
                connector_id=cc_pair.connector_id,
                credential_id=cc_pair.credential_id,
            )
            # if there are no credentials left, delete the connector
            connector = fetch_connector_by_id(
                db_session=db_session,
                connector_id=cc_pair.connector_id,
            )
            if not connector or not len(connector.credentials):
                task_logger.info(
                    "Found no credentials left for connector, deleting connector"
                )
                db_session.delete(connector)
            db_session.commit()
        except Exception as e:
            stack_trace = traceback.format_exc()
            error_message = f"Error: {str(e)}\n\nStack Trace:\n{stack_trace}"
            add_deletion_failure_message(db_session, cc_pair.id, error_message)
            task_logger.exception(
                f"Failed to run connector_deletion. "
                f"connector_id={cc_pair.connector_id} credential_id={cc_pair.credential_id}"
            )
            raise e

    task_logger.info(
        f"Successfully deleted connector_credential_pair with connector_id: '{cc_pair.connector_id}' "
        f"and credential_id: '{cc_pair.credential_id}'. "
        f"Deleted {initial_count} docs."
    )

    r.delete(rcd.taskset_key)
    r.delete(rcd.fence_key)


@celery_app.task(name="monitor_vespa_sync", soft_time_limit=300)
def monitor_vespa_sync() -> None:
    """This is a celery beat task that monitors and finalizes metadata sync tasksets.
    It scans for fence values and then gets the counts of any associated tasksets.
    If the count is 0, that means all tasks finished and we should clean up.

    This task lock timeout is CELERY_METADATA_SYNC_BEAT_LOCK_TIMEOUT seconds, so don't
    do anything too expensive in this function!
    """
    r = redis_pool.get_client()

    lock_beat = r.lock(
        DanswerRedisLocks.MONITOR_VESPA_SYNC_BEAT_LOCK,
        timeout=CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT,
    )

    try:
        # prevent overlapping tasks
        if not lock_beat.acquire(blocking=False):
            return

        if r.exists(RedisConnectorCredentialPair.get_fence_key()):
            monitor_connector_taskset(r)

        for key_bytes in r.scan_iter(RedisDocumentSet.FENCE_PREFIX + "*"):
            monitor_document_set_taskset(key_bytes, r)

        for key_bytes in r.scan_iter(RedisUserGroup.FENCE_PREFIX + "*"):
            monitor_usergroup_taskset = fetch_versioned_implementation_with_fallback(
                "danswer.background.celery_utils",
                "monitor_usergroup_taskset",
                noop_fallback,
            )

            monitor_usergroup_taskset(key_bytes, r)

        for key_bytes in r.scan_iter(RedisConnectorDeletion.FENCE_PREFIX + "*"):
            monitor_connector_deletion_taskset(key_bytes, r)

        # r_celery = celery_app.broker_connection().channel().client
        # length = celery_get_queue_length(DanswerCeleryQueues.VESPA_METADATA_SYNC, r_celery)
        # task_logger.warning(f"queue={DanswerCeleryQueues.VESPA_METADATA_SYNC} length={length}")
    except SoftTimeLimitExceeded:
        task_logger.info(
            "Soft time limit exceeded, task is being terminated gracefully."
        )
    finally:
        if lock_beat.owned():
            lock_beat.release()


@beat_init.connect
def on_beat_init(sender: Any, **kwargs: Any) -> None:
    init_sqlalchemy_engine(POSTGRES_CELERY_BEAT_APP_NAME)


@worker_init.connect
def on_worker_init(sender: Any, **kwargs: Any) -> None:
    init_sqlalchemy_engine(POSTGRES_CELERY_WORKER_APP_NAME)

    # TODO(rkuo): this is singleton work that should be done on startup exactly once
    # if we run multiple workers, we'll need to centralize where this cleanup happens
    r = redis_pool.get_client()

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

    # reformats celery's worker logger
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


#####
# Celery Beat (Periodic Tasks) Settings
#####
celery_app.conf.beat_schedule = {
    "check-for-vespa-sync": {
        "task": "check_for_vespa_sync_task",
        "schedule": timedelta(seconds=5),
        "options": {"priority": DanswerCeleryPriority.HIGH},
    },
}
celery_app.conf.beat_schedule.update(
    {
        "check-for-connector-deletion-task": {
            "task": "check_for_connector_deletion_task",
            # don't need to check too often, since we kick off a deletion initially
            # during the API call that actually marks the CC pair for deletion
            "schedule": timedelta(minutes=1),
            "options": {"priority": DanswerCeleryPriority.HIGH},
        },
    }
)
celery_app.conf.beat_schedule.update(
    {
        "check-for-prune": {
            "task": "check_for_prune_task",
            "schedule": timedelta(seconds=5),
            "options": {"priority": DanswerCeleryPriority.HIGH},
        },
    }
)
celery_app.conf.beat_schedule.update(
    {
        "kombu-message-cleanup": {
            "task": "kombu_message_cleanup_task",
            "schedule": timedelta(seconds=3600),
            "options": {"priority": DanswerCeleryPriority.LOWEST},
        },
    }
)
celery_app.conf.beat_schedule.update(
    {
        "monitor-vespa-sync": {
            "task": "monitor_vespa_sync",
            "schedule": timedelta(seconds=5),
            "options": {"priority": DanswerCeleryPriority.HIGH},
        },
    }
)
