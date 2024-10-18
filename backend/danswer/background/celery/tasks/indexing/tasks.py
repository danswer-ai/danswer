from datetime import datetime
from datetime import timezone
from http import HTTPStatus
from time import sleep
from typing import cast
from uuid import uuid4

from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from redis import Redis
from sqlalchemy.orm import Session

from danswer.background.celery.celery_app import celery_app
from danswer.background.celery.celery_app import task_logger
from danswer.background.celery.celery_redis import RedisConnectorIndexing
from danswer.background.celery.tasks.shared.tasks import RedisConnectorIndexingFenceData
from danswer.background.indexing.job_client import SimpleJobClient
from danswer.background.indexing.run_indexing import run_indexing_entrypoint
from danswer.configs.app_configs import DISABLE_INDEX_UPDATE_ON_SWAP
from danswer.configs.constants import CELERY_INDEXING_LOCK_TIMEOUT
from danswer.configs.constants import CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT
from danswer.configs.constants import DANSWER_REDIS_FUNCTION_LOCK_PREFIX
from danswer.configs.constants import DanswerCeleryPriority
from danswer.configs.constants import DanswerCeleryQueues
from danswer.configs.constants import DanswerRedisLocks
from danswer.configs.constants import DocumentSource
from danswer.db.connector_credential_pair import fetch_connector_credential_pairs
from danswer.db.connector_credential_pair import get_connector_credential_pair_from_id
from danswer.db.engine import get_db_current_time
from danswer.db.engine import get_session_with_tenant
from danswer.db.enums import ConnectorCredentialPairStatus
from danswer.db.enums import IndexingStatus
from danswer.db.enums import IndexModelStatus
from danswer.db.index_attempt import create_index_attempt
from danswer.db.index_attempt import get_index_attempt
from danswer.db.index_attempt import get_last_attempt_for_cc_pair
from danswer.db.index_attempt import mark_attempt_failed
from danswer.db.models import ConnectorCredentialPair
from danswer.db.models import IndexAttempt
from danswer.db.models import SearchSettings
from danswer.db.search_settings import get_current_search_settings
from danswer.db.search_settings import get_secondary_search_settings
from danswer.redis.redis_pool import get_redis_client
from danswer.utils.logger import setup_logger
from danswer.utils.variable_functionality import global_version

logger = setup_logger()


@shared_task(
    name="check_for_indexing",
    soft_time_limit=300,
)
def check_for_indexing(tenant_id: str | None) -> int | None:
    tasks_created = 0

    r = get_redis_client()

    lock_beat = r.lock(
        DanswerRedisLocks.CHECK_INDEXING_BEAT_LOCK,
        timeout=CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT,
    )

    try:
        # these tasks should never overlap
        if not lock_beat.acquire(blocking=False):
            return None

        with get_session_with_tenant(tenant_id) as db_session:
            # Get the primary search settings
            primary_search_settings = get_current_search_settings(db_session)
            search_settings = [primary_search_settings]

            # Check for secondary search settings
            secondary_search_settings = get_secondary_search_settings(db_session)
            if secondary_search_settings is not None:
                # If secondary settings exist, add them to the list
                search_settings.append(secondary_search_settings)

            cc_pairs = fetch_connector_credential_pairs(db_session)
            for cc_pair in cc_pairs:
                for search_settings_instance in search_settings:
                    rci = RedisConnectorIndexing(
                        cc_pair.id, search_settings_instance.id
                    )
                    if r.exists(rci.fence_key):
                        continue

                    last_attempt = get_last_attempt_for_cc_pair(
                        cc_pair.id, search_settings_instance.id, db_session
                    )
                    if not _should_index(
                        cc_pair=cc_pair,
                        last_index=last_attempt,
                        search_settings_instance=search_settings_instance,
                        secondary_index_building=len(search_settings) > 1,
                        db_session=db_session,
                    ):
                        continue

                    # using a task queue and only allowing one task per cc_pair/search_setting
                    # prevents us from starving out certain attempts
                    attempt_id = try_creating_indexing_task(
                        cc_pair,
                        search_settings_instance,
                        False,
                        db_session,
                        r,
                        tenant_id,
                    )
                    if attempt_id:
                        task_logger.info(
                            f"Indexing queued: cc_pair_id={cc_pair.id} index_attempt_id={attempt_id}"
                        )
                        tasks_created += 1
    except SoftTimeLimitExceeded:
        task_logger.info(
            "Soft time limit exceeded, task is being terminated gracefully."
        )
    except Exception:
        task_logger.exception("Unexpected exception")
    finally:
        if lock_beat.owned():
            lock_beat.release()

    return tasks_created


def _should_index(
    cc_pair: ConnectorCredentialPair,
    last_index: IndexAttempt | None,
    search_settings_instance: SearchSettings,
    secondary_index_building: bool,
    db_session: Session,
) -> bool:
    """Checks various global settings and past indexing attempts to determine if
    we should try to start indexing the cc pair / search setting combination.

    Note that tactical checks such as preventing overlap with a currently running task
    are not handled here.

    Return True if we should try to index, False if not.
    """
    connector = cc_pair.connector

    # uncomment for debugging
    # task_logger.info(f"_should_index: "
    #                  f"cc_pair={cc_pair.id} "
    #                  f"connector={cc_pair.connector_id} "
    #                  f"refresh_freq={connector.refresh_freq}")

    # don't kick off indexing for `NOT_APPLICABLE` sources
    if connector.source == DocumentSource.NOT_APPLICABLE:
        return False

    # User can still manually create single indexing attempts via the UI for the
    # currently in use index
    if DISABLE_INDEX_UPDATE_ON_SWAP:
        if (
            search_settings_instance.status == IndexModelStatus.PRESENT
            and secondary_index_building
        ):
            return False

    # When switching over models, always index at least once
    if search_settings_instance.status == IndexModelStatus.FUTURE:
        if last_index:
            # No new index if the last index attempt succeeded
            # Once is enough. The model will never be able to swap otherwise.
            if last_index.status == IndexingStatus.SUCCESS:
                return False

            # No new index if the last index attempt is waiting to start
            if last_index.status == IndexingStatus.NOT_STARTED:
                return False

            # No new index if the last index attempt is running
            if last_index.status == IndexingStatus.IN_PROGRESS:
                return False
        else:
            if (
                connector.id == 0 or connector.source == DocumentSource.INGESTION_API
            ):  # Ingestion API
                return False
        return True

    # If the connector is paused or is the ingestion API, don't index
    # NOTE: during an embedding model switch over, the following logic
    # is bypassed by the above check for a future model
    if (
        not cc_pair.status.is_active()
        or connector.id == 0
        or connector.source == DocumentSource.INGESTION_API
    ):
        return False

    # if no attempt has ever occurred, we should index regardless of refresh_freq
    if not last_index:
        return True

    if connector.refresh_freq is None:
        return False

    current_db_time = get_db_current_time(db_session)
    time_since_index = current_db_time - last_index.time_updated
    if time_since_index.total_seconds() < connector.refresh_freq:
        return False

    return True


def try_creating_indexing_task(
    cc_pair: ConnectorCredentialPair,
    search_settings: SearchSettings,
    reindex: bool,
    db_session: Session,
    r: Redis,
    tenant_id: str | None,
) -> int | None:
    """Checks for any conditions that should block the indexing task from being
    created, then creates the task.

    Does not check for scheduling related conditions as this function
    is used to trigger indexing immediately.
    """

    LOCK_TIMEOUT = 30

    # we need to serialize any attempt to trigger indexing since it can be triggered
    # either via celery beat or manually (API call)
    lock = r.lock(
        DANSWER_REDIS_FUNCTION_LOCK_PREFIX + "try_creating_indexing_task",
        timeout=LOCK_TIMEOUT,
    )

    acquired = lock.acquire(blocking_timeout=LOCK_TIMEOUT / 2)
    if not acquired:
        return None

    try:
        rci = RedisConnectorIndexing(cc_pair.id, search_settings.id)

        # skip if already indexing
        if r.exists(rci.fence_key):
            return None

        # skip indexing if the cc_pair is deleting
        db_session.refresh(cc_pair)
        if cc_pair.status == ConnectorCredentialPairStatus.DELETING:
            return None

        # add a long running generator task to the queue
        r.delete(rci.generator_complete_key)
        r.delete(rci.taskset_key)

        custom_task_id = f"{rci.generator_task_id_prefix}_{uuid4()}"

        # create the index attempt ... just for tracking purposes
        index_attempt_id = create_index_attempt(
            cc_pair.id,
            search_settings.id,
            from_beginning=reindex,
            db_session=db_session,
        )

        result = celery_app.send_task(
            "connector_indexing_proxy_task",
            kwargs=dict(
                index_attempt_id=index_attempt_id,
                cc_pair_id=cc_pair.id,
                search_settings_id=search_settings.id,
                tenant_id=tenant_id,
            ),
            queue=DanswerCeleryQueues.CONNECTOR_INDEXING,
            task_id=custom_task_id,
            priority=DanswerCeleryPriority.MEDIUM,
        )
        if not result:
            return None

        # set this only after all tasks have been added
        fence_value = RedisConnectorIndexingFenceData(
            index_attempt_id=index_attempt_id,
            started=None,
            submitted=datetime.now(timezone.utc),
            celery_task_id=result.id,
        )
        r.set(rci.fence_key, fence_value.model_dump_json())
    except Exception:
        task_logger.exception("Unexpected exception")
        return None
    finally:
        if lock.owned():
            lock.release()

    return index_attempt_id


@shared_task(name="connector_indexing_proxy_task", acks_late=False, track_started=True)
def connector_indexing_proxy_task(
    index_attempt_id: int,
    cc_pair_id: int,
    search_settings_id: int,
    tenant_id: str | None,
) -> None:
    """celery tasks are forked, but forking is unstable.  This proxies work to a spawned task."""

    client = SimpleJobClient()

    job = client.submit(
        connector_indexing_task,
        index_attempt_id,
        cc_pair_id,
        search_settings_id,
        tenant_id,
        global_version.is_ee_version(),
        pure=False,
    )

    if not job:
        return

    while True:
        sleep(10)
        with get_session_with_tenant(tenant_id) as db_session:
            index_attempt = get_index_attempt(
                db_session=db_session, index_attempt_id=index_attempt_id
            )

            # do nothing for ongoing jobs that haven't been stopped
            if not job.done():
                if not index_attempt:
                    continue

                if not index_attempt.is_finished():
                    continue

            if job.status == "error":
                logger.error(job.exception())

            job.release()
            break

    return


def connector_indexing_task(
    index_attempt_id: int,
    cc_pair_id: int,
    search_settings_id: int,
    tenant_id: str | None,
    is_ee: bool,
) -> int | None:
    """Indexing task. For a cc pair, this task pulls all document IDs from the source
    and compares those IDs to locally stored documents and deletes all locally stored IDs missing
    from the most recently pulled document ID list

    acks_late must be set to False. Otherwise, celery's visibility timeout will
    cause any task that runs longer than the timeout to be redispatched by the broker.
    There appears to be no good workaround for this, so we need to handle redispatching
    manually.

    Returns None if the task did not run (possibly due to a conflict).
    Otherwise, returns an int >= 0 representing the number of indexed docs.
    """

    attempt = None
    n_final_progress = 0

    r = get_redis_client()

    rci = RedisConnectorIndexing(cc_pair_id, search_settings_id)

    lock = r.lock(
        rci.generator_lock_key,
        timeout=CELERY_INDEXING_LOCK_TIMEOUT,
    )

    acquired = lock.acquire(blocking=False)
    if not acquired:
        task_logger.warning(
            f"Indexing task already running, exiting...: "
            f"cc_pair_id={cc_pair_id} search_settings_id={search_settings_id}"
        )
        # r.set(rci.generator_complete_key, HTTPStatus.CONFLICT.value)
        return None

    try:
        with get_session_with_tenant(tenant_id) as db_session:
            attempt = get_index_attempt(db_session, index_attempt_id)
            if not attempt:
                raise ValueError(
                    f"Index attempt not found: index_attempt_id={index_attempt_id}"
                )

            cc_pair = get_connector_credential_pair_from_id(
                cc_pair_id=cc_pair_id,
                db_session=db_session,
            )

            if not cc_pair:
                raise ValueError(f"cc_pair not found: cc_pair_id={cc_pair_id}")

            if not cc_pair.connector:
                raise ValueError(
                    f"Connector not found: connector_id={cc_pair.connector_id}"
                )

            if not cc_pair.credential:
                raise ValueError(
                    f"Credential not found: credential_id={cc_pair.credential_id}"
                )

            rci = RedisConnectorIndexing(cc_pair_id, search_settings_id)

            # Define the callback function
            def redis_increment_callback(amount: int) -> None:
                lock.reacquire()
                r.incrby(rci.generator_progress_key, amount)

            run_indexing_entrypoint(
                index_attempt_id,
                tenant_id,
                cc_pair_id,
                is_ee,
                progress_callback=redis_increment_callback,
            )

            # get back the total number of indexed docs and return it
            generator_progress_value = r.get(rci.generator_progress_key)
            if generator_progress_value is not None:
                try:
                    n_final_progress = int(cast(int, generator_progress_value))
                except ValueError:
                    pass

            r.set(rci.generator_complete_key, HTTPStatus.OK.value)
    except Exception as e:
        task_logger.exception(f"Failed to run indexing for cc_pair_id={cc_pair_id}.")
        if attempt:
            mark_attempt_failed(attempt, db_session, failure_reason=str(e))

        r.delete(rci.generator_lock_key)
        r.delete(rci.generator_progress_key)
        r.delete(rci.taskset_key)
        r.delete(rci.fence_key)
        raise e
    finally:
        if lock.owned():
            lock.release()

    return n_final_progress
