from datetime import datetime
from datetime import timezone

from sqlalchemy.orm import Session

from danswer.access.access import get_access_for_documents
from danswer.db.connector_credential_pair import get_connector_credential_pair_from_id
from danswer.db.search_settings import get_current_search_settings
from danswer.document_index.factory import get_default_document_index
from danswer.document_index.interfaces import UpdateRequest
from danswer.utils.logger import setup_logger
from ee.danswer.external_permissions.permission_sync_function_map import (
    DOC_PERMISSIONS_FUNC_MAP,
)
from ee.danswer.external_permissions.permission_sync_function_map import (
    FULL_FETCH_PERIOD_IN_SECONDS,
)
from ee.danswer.external_permissions.permission_sync_function_map import (
    GROUP_PERMISSIONS_FUNC_MAP,
)
from ee.danswer.external_permissions.permission_sync_utils import (
    get_docs_with_additional_info,
)

logger = setup_logger()


def run_permission_sync_entrypoint(
    db_session: Session,
    cc_pair_id: int,
) -> None:
    # TODO: seperate out group and doc sync
    cc_pair = get_connector_credential_pair_from_id(cc_pair_id, db_session)
    if cc_pair is None:
        raise ValueError(f"No connector credential pair found for id: {cc_pair_id}")

    source_type = cc_pair.connector.source

    doc_sync_func = DOC_PERMISSIONS_FUNC_MAP.get(source_type)
    group_sync_func = GROUP_PERMISSIONS_FUNC_MAP.get(source_type)

    if doc_sync_func is None:
        raise ValueError(
            f"No permission sync function found for source type: {source_type}"
        )

    sync_details = cc_pair.auto_sync_options
    if sync_details is None:
        raise ValueError(f"No auto sync options found for source type: {source_type}")

    # If the source type is not polling, we only fetch the permissions every
    # _FULL_FETCH_PERIOD_IN_SECONDS seconds
    full_fetch_period = FULL_FETCH_PERIOD_IN_SECONDS[source_type]
    if full_fetch_period is not None:
        last_sync = cc_pair.last_time_perm_sync
        if (
            last_sync
            and (
                datetime.now(timezone.utc) - last_sync.replace(tzinfo=timezone.utc)
            ).total_seconds()
            < full_fetch_period
        ):
            return

    # Here we run the connector to grab all the ids
    # this may grab ids before they are indexed but that is fine because
    # we create a document in postgres to hold the permissions info
    # until the indexing job has a chance to run
    docs_with_additional_info = get_docs_with_additional_info(
        db_session=db_session,
        cc_pair=cc_pair,
    )

    # This function updates:
    # - the user_email <-> external_user_group_id mapping
    # in postgres without committing
    logger.debug(f"Syncing groups for {source_type}")
    if group_sync_func is not None:
        group_sync_func(
            db_session,
            cc_pair,
            docs_with_additional_info,
            sync_details,
        )

    # This function updates:
    # - the user_email <-> document mapping
    # - the external_user_group_id <-> document mapping
    # in postgres without committing
    logger.debug(f"Syncing docs for {source_type}")
    doc_sync_func(
        db_session,
        cc_pair,
        docs_with_additional_info,
        sync_details,
    )

    # This function fetches the updated access for the documents
    # and returns a dictionary of document_ids and access
    # This is the access we want to update vespa with
    docs_access = get_access_for_documents(
        document_ids=[doc.id for doc in docs_with_additional_info],
        db_session=db_session,
    )

    # Then we build the update requests to update vespa
    update_reqs = [
        UpdateRequest(document_ids=[doc_id], access=doc_access)
        for doc_id, doc_access in docs_access.items()
    ]

    # Don't bother sync-ing secondary, it will be sync-ed after switch anyway
    search_settings = get_current_search_settings(db_session)
    document_index = get_default_document_index(
        primary_index_name=search_settings.index_name,
        secondary_index_name=None,
    )

    try:
        # update vespa
        document_index.update(update_reqs)
        # update postgres
        db_session.commit()
    except Exception as e:
        logger.error(f"Error updating document index: {e}")
        db_session.rollback()
