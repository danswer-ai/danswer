import logging
import time
from datetime import datetime
from datetime import timedelta

import dask
from dask.distributed import Client
from dask.distributed import Future
from distributed import LocalCluster
from sqlalchemy.orm import Session

from danswer.background.indexing.dask_utils import ResourceLogger
from danswer.background.indexing.job_client import SimpleJob
from danswer.background.indexing.job_client import SimpleJobClient
from danswer.configs.app_configs import CLEANUP_INDEXING_JOBS_TIMEOUT
from danswer.configs.app_configs import DASK_JOB_CLIENT_ENABLED
from danswer.configs.constants import DocumentSource
from danswer.db.engine import get_db_current_time
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.models import PermissionSyncJobType
from danswer.db.models import PermissionSyncRun
from danswer.db.models import PermissionSyncStatus
from danswer.utils.logger import setup_logger
from danswer.utils.variable_functionality import global_version
from ee.danswer.configs.app_configs import NUM_PERMISSION_WORKERS
from ee.danswer.connectors.factory import CONNECTOR_PERMISSION_FUNC_MAP
from ee.danswer.db.connector_credential_pair import get_all_source_types_with_auto_sync
from ee.danswer.db.connector_credential_pair import get_cc_pairs_by_source
from ee.danswer.db.external_perm import clear_external_permission_for_source__no_commit
from ee.danswer.db.external_perm import create_external_permissions__no_commit
from ee.danswer.db.external_perm import fetch_external_user_cache
from ee.danswer.db.external_perm import upsert_external_user_cache
from ee.danswer.db.permission_sync import create_perm_sync
from ee.danswer.db.permission_sync import expire_perm_sync_timed_out
from ee.danswer.db.permission_sync import get_last_sync_attempt
from ee.danswer.db.permission_sync import get_perm_sync_attempt
from ee.danswer.db.permission_sync import mark_all_inprogress_permission_sync_failed
from shared_configs.configs import LOG_LEVEL

logger = setup_logger()

# If the indexing dies, it's most likely due to resource constraints,
# restarting just delays the eventual failure, not useful to the user
dask.config.set({"distributed.scheduler.allowed-failures": 0})


def run_group_perm_sync_entrypoint(perm_sync_id: int) -> None:
    global_version.set_ee()
    with Session(get_sqlalchemy_engine()) as db_session:
        perm_sync = get_perm_sync_attempt(
            attempt_id=perm_sync_id, db_session=db_session
        )
        source_type = perm_sync.source_type

        try:
            logger.info(f"Running group sync for connector type '{source_type}'")

            cc_pairs_to_sync = get_cc_pairs_by_source(
                db_session=db_session,
                source_type=source_type,
                only_sync=True,
            )

            ext_user_cache_entries = fetch_external_user_cache(
                db_session=db_session,
                source_type=source_type,
            )
            ext_user_cache = {
                entry.external_user_id: entry for entry in ext_user_cache_entries
            }

            source_specific_group_sync_fnc, _ = CONNECTOR_PERMISSION_FUNC_MAP[
                source_type
            ]

            sync_res = source_specific_group_sync_fnc(cc_pairs_to_sync, ext_user_cache)

            clear_external_permission_for_source__no_commit(
                db_session=db_session,
                source_type=source_type,
            )
            create_external_permissions__no_commit(
                db_session=db_session,
                group_defs=sync_res.group_defs,
            )

            upsert_external_user_cache(
                db_session=db_session,
                user_caches=sync_res.user_ext_cache_update,
            )

            perm_sync.status = PermissionSyncStatus.SUCCESS

            logger.info(f"Completed group sync for connector type: '{source_type}'")
        except Exception as e:
            logger.exception(f"Connector external group sync failed due to {e}")
            perm_sync.status = PermissionSyncStatus.FAILED
            perm_sync.error_msg = str(e)

        db_session.commit()


def run_user_perm_sync_entrypoint(perm_sync_id: int) -> None:
    global_version.set_ee()
    with Session(get_sqlalchemy_engine()) as db_session:
        perm_sync = get_perm_sync_attempt(
            attempt_id=perm_sync_id, db_session=db_session
        )
        source_type = perm_sync.source_type
        try:
            _, source_specific_user_sync_fnc = CONNECTOR_PERMISSION_FUNC_MAP[
                source_type
            ]

            # The required functionality varies heavily from connector to connector
            # It is handled entirely
            source_specific_user_sync_fnc()
            perm_sync.status = PermissionSyncStatus.SUCCESS

            logger.info(f"Completed document sync for connector type: '{source_type}'")
        except Exception as e:
            logger.exception(f"Connector external document sync failed due to {e}")
            perm_sync.status = PermissionSyncStatus.FAILED
            perm_sync.error_msg = str(e)


def cleanup_perm_sync_jobs(
    existing_jobs: dict[
        tuple[int, DocumentSource, PermissionSyncJobType], Future | SimpleJob
    ],
    # Just reusing the same timeout, fine for now
    timeout_hours: int = CLEANUP_INDEXING_JOBS_TIMEOUT,
) -> dict[tuple[int, DocumentSource, PermissionSyncJobType], Future | SimpleJob]:
    existing_jobs_copy = existing_jobs.copy()

    with Session(get_sqlalchemy_engine()) as db_session:
        # clean up completed jobs
        for (attempt_id, source, sync_type), job in existing_jobs.items():
            perm_sync_attempt = get_perm_sync_attempt(
                attempt_id=attempt_id, db_session=db_session
            )

            # do nothing for ongoing jobs that haven't been stopped
            if (
                not job.done()
                and perm_sync_attempt.status == PermissionSyncStatus.IN_PROGRESS
            ):
                continue

            if job.status == "error":
                logger.error(job.exception())

            job.release()
            del existing_jobs_copy[(attempt_id, source, sync_type)]

        # clean up in-progress jobs that were never completed
        expire_perm_sync_timed_out(
            timeout_hours=timeout_hours,
            db_session=db_session,
        )

    return existing_jobs_copy


def get_connector_sync_cycle(
    source_type: DocumentSource,
    sync_type: PermissionSyncJobType,
) -> timedelta:
    # Sync times for group level and document/user level
    source_map = {
        DocumentSource.GOOGLE_DRIVE: (timedelta(minutes=10), timedelta(minutes=10))
    }
    if source_type not in DocumentSource:
        raise ValueError("Not a valid permission sync connector type")

    if sync_type == PermissionSyncJobType.GROUP_LEVEL:
        return source_map[source_type][0]
    return source_map[source_type][1]


def _should_create_new_sync(
    last_attempt: PermissionSyncRun | None,
    sync_type: PermissionSyncJobType,
    db_session: Session,
) -> bool:
    if not last_attempt:
        return True

    if last_attempt.status == PermissionSyncStatus.FAILED:
        return True

    if last_attempt.status == PermissionSyncStatus.IN_PROGRESS:
        return False

    current_db_time = get_db_current_time(db_session)
    time_since_index = current_db_time - last_attempt.start_time
    cycle_time = get_connector_sync_cycle(last_attempt.source_type, sync_type)
    if time_since_index > cycle_time:
        return True
    return False


def create_perm_sync_jobs(
    sync_type: PermissionSyncJobType,
    existing_jobs: dict[
        tuple[int, DocumentSource, PermissionSyncJobType], Future | SimpleJob
    ],
    client: Client | SimpleJobClient,
) -> dict[tuple[int, DocumentSource, PermissionSyncJobType], Future | SimpleJob]:
    existing_jobs_copy = existing_jobs.copy()
    sources_w_runs = [
        key[1] for key in existing_jobs_copy.keys() if key[2] == sync_type
    ]
    with Session(get_sqlalchemy_engine()) as db_session:
        sources_types_to_sync = get_all_source_types_with_auto_sync(db_session)
        for source_type in sources_types_to_sync:
            if source_type not in CONNECTOR_PERMISSION_FUNC_MAP:
                logger.exception(
                    f"{source_type} was set to do access sync but there is no handling for it."
                )
                continue
            if source_type in sources_w_runs:
                continue

            last_attempt = get_last_sync_attempt(source_type, sync_type, db_session)

            if not _should_create_new_sync(
                last_attempt=last_attempt,
                sync_type=sync_type,
                db_session=db_session,
            ):
                continue

            perm_sync = create_perm_sync(
                source_type=source_type,
                sync_type=sync_type,
                db_session=db_session,
            )
            if sync_type == PermissionSyncJobType.GROUP_LEVEL:
                run = client.submit(
                    run_group_perm_sync_entrypoint, perm_sync.id, pure=False
                )
            elif sync_type == PermissionSyncJobType.USER_LEVEL:
                run = client.submit(
                    run_user_perm_sync_entrypoint, perm_sync.id, pure=False
                )

            logger.info(
                f"Kicked off document permission sync for source type {source_type}"
            )

            if run:
                existing_jobs_copy[(perm_sync.id, source_type, sync_type)] = run

    return existing_jobs_copy


def permission_loop(delay: int = 10, num_workers: int = NUM_PERMISSION_WORKERS) -> None:
    client: Client | SimpleJobClient
    if DASK_JOB_CLIENT_ENABLED:
        cluster_primary = LocalCluster(
            n_workers=num_workers,
            threads_per_worker=1,
            # there are warning about high memory usage + "Event loop unresponsive"
            # which are not relevant to us since our workers are expected to use a
            # lot of memory + involve CPU intensive tasks that will not relinquish
            # the event loop
            silence_logs=logging.ERROR,
        )
        client = Client(cluster_primary)
        if LOG_LEVEL.lower() == "debug":
            client.register_worker_plugin(ResourceLogger())
    else:
        client = SimpleJobClient(n_workers=num_workers)

    existing_jobs: dict[
        tuple[int, DocumentSource, PermissionSyncJobType], Future | SimpleJob
    ] = {}
    engine = get_sqlalchemy_engine()

    with Session(engine) as db_session:
        # Any jobs still in progress on restart must have died
        mark_all_inprogress_permission_sync_failed(db_session)

    while True:
        start = time.time()
        start_time_utc = datetime.utcfromtimestamp(start).strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"Checking for Permission Sync, current UTC time: {start_time_utc}")

        if existing_jobs:
            logger.debug(
                "Found existing permission sync jobs: "
                f"{[(attempt_id, job.status) for attempt_id, job in existing_jobs.items()]}"
            )

        try:
            existing_jobs = cleanup_perm_sync_jobs(existing_jobs=existing_jobs)
            for sync_type in [
                PermissionSyncJobType.GROUP_LEVEL,
                PermissionSyncJobType.USER_LEVEL,
            ]:
                existing_jobs = create_perm_sync_jobs(
                    sync_type=sync_type, existing_jobs=existing_jobs, client=client
                )
        except Exception as e:
            logger.exception(f"Failed to run update due to {e}")
        sleep_time = delay - (time.time() - start)
        if sleep_time > 0:
            time.sleep(sleep_time)


def update__main() -> None:
    logger.info("Starting Permission Syncing Loop")
    permission_loop()


if __name__ == "__main__":
    global_version.set_ee()
    update__main()
