from sqlalchemy.orm import Session

from danswer.db.connector_credential_pair import get_connector_credential_pair_from_id
from danswer.utils.logger import setup_logger
from ee.danswer.external_permissions.sync_params import GROUP_PERMISSIONS_FUNC_MAP

logger = setup_logger()


def run_external_group_permission_sync(
    db_session: Session,
    cc_pair_id: int,
) -> None:
    cc_pair = get_connector_credential_pair_from_id(cc_pair_id, db_session)
    if cc_pair is None:
        raise ValueError(f"No connector credential pair found for id: {cc_pair_id}")

    source_type = cc_pair.connector.source
    group_sync_func = GROUP_PERMISSIONS_FUNC_MAP.get(source_type)

    if group_sync_func is None:
        # Not all sync connectors support group permissions so this is fine
        return

    try:
        # This function updates:
        # - the user_email <-> external_user_group_id mapping
        # in postgres without committing
        logger.debug(f"Syncing groups for {source_type}")
        if group_sync_func is not None:
            group_sync_func(
                cc_pair,
            )

        # update postgres
        db_session.commit()
    except Exception:
        logger.exception("Error Syncing Group Permissions")
        db_session.rollback()
