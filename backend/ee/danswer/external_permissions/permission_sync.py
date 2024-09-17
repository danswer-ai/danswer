from collections.abc import Callable
from typing import Any

from sqlalchemy.orm import Session

from danswer.access.access import get_access_for_documents
from danswer.configs.constants import DocumentSource
from danswer.db.connector_credential_pair import get_connector_credential_pair_from_id
from danswer.db.models import ConnectorCredentialPair
from danswer.db.search_settings import get_current_search_settings
from danswer.document_index.factory import get_default_document_index
from danswer.document_index.interfaces import UpdateRequest
from danswer.utils.logger import setup_logger
from ee.danswer.external_permissions.confluence.doc_sync import confluence_doc_sync
from ee.danswer.external_permissions.confluence.group_sync import confluence_group_sync
from ee.danswer.external_permissions.google_drive.doc_sync import gdrive_doc_sync
from ee.danswer.external_permissions.google_drive.group_sync import gdrive_group_sync
from ee.danswer.external_permissions.permission_sync_utils import DocsWithAdditionalInfo
from ee.danswer.external_permissions.permission_sync_utils import (
    get_docs_with_additional_info,
)

logger = setup_logger()


GroupSyncFuncType = Callable[
    [Session, ConnectorCredentialPair, list[DocsWithAdditionalInfo], dict[str, Any]],
    None,
]

DocSyncFuncType = Callable[
    [Session, ConnectorCredentialPair, list[DocsWithAdditionalInfo], dict[str, Any]],
    None,
]

# These functions update:
# - the user_email <-> document mapping
# - the external_user_group_id <-> document mapping
# in postgres without committing
# THIS ONE IS NECESSARY FOR AUTO SYNC TO WORK
_DOC_PERMISSIONS_FUNC_MAP: dict[DocumentSource, DocSyncFuncType] = {
    DocumentSource.GOOGLE_DRIVE: gdrive_doc_sync,
    DocumentSource.CONFLUENCE: confluence_doc_sync,
}

# These functions update:
# - the user_email <-> external_user_group_id mapping
# in postgres without committing
# THIS ONE IS OPTIONAL ON AN APP BY APP BASIS
_GROUP_PERMISSIONS_FUNC_MAP: dict[DocumentSource, GroupSyncFuncType] = {
    DocumentSource.GOOGLE_DRIVE: gdrive_group_sync,
    DocumentSource.CONFLUENCE: confluence_group_sync,
}


def run_permission_sync_entrypoint(
    db_session: Session,
    cc_pair_id: int,
) -> None:
    cc_pair = get_connector_credential_pair_from_id(cc_pair_id, db_session)
    if cc_pair is None:
        raise ValueError(f"No connector credential pair found for id: {cc_pair_id}")

    source_type = cc_pair.connector.source

    doc_sync_func = _DOC_PERMISSIONS_FUNC_MAP.get(source_type)
    group_sync_func = _GROUP_PERMISSIONS_FUNC_MAP.get(source_type)

    if doc_sync_func is None:
        raise ValueError(
            f"No permission sync function found for source type: {source_type}"
        )

    sync_details = cc_pair.auto_sync_options
    if sync_details is None:
        raise ValueError(f"No auto sync options found for source type: {source_type}")

    # Here we run the connector to grab all the ids
    # this may grab ids before they are indexed but that is fine because
    # we create a document in postgres to hold the permissions info
    # until the indexing job has a chance to run
    docs_with_additional_info = get_docs_with_additional_info(
        db_session=db_session, cc_pair=cc_pair
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
