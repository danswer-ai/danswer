from collections.abc import Callable
from typing import Any

from sqlalchemy.orm import Session

from danswer.configs.constants import DocumentSource
from danswer.db.models import ConnectorCredentialPair
from ee.danswer.external_permissions.confluence.doc_sync import confluence_doc_sync
from ee.danswer.external_permissions.confluence.group_sync import confluence_group_sync
from ee.danswer.external_permissions.google_drive.doc_sync import gdrive_doc_sync
from ee.danswer.external_permissions.google_drive.group_sync import gdrive_group_sync
from ee.danswer.external_permissions.permission_sync_utils import DocsWithAdditionalInfo

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
DOC_PERMISSIONS_FUNC_MAP: dict[DocumentSource, DocSyncFuncType] = {
    DocumentSource.GOOGLE_DRIVE: gdrive_doc_sync,
    DocumentSource.CONFLUENCE: confluence_doc_sync,
}

# These functions update:
# - the user_email <-> external_user_group_id mapping
# in postgres without committing
# THIS ONE IS OPTIONAL ON AN APP BY APP BASIS
GROUP_PERMISSIONS_FUNC_MAP: dict[DocumentSource, GroupSyncFuncType] = {
    DocumentSource.GOOGLE_DRIVE: gdrive_group_sync,
    DocumentSource.CONFLUENCE: confluence_group_sync,
}


# None means that the connector supports polling from last_time_perm_sync to now
FULL_FETCH_PERIOD_IN_SECONDS: dict[DocumentSource, int | None] = {
    # Polling is supported
    DocumentSource.GOOGLE_DRIVE: None,
    # Polling is not supported so we fetch all doc permissions every 10 minutes
    DocumentSource.CONFLUENCE: 10 * 60,
}


def check_if_valid_sync_source(source_type: DocumentSource) -> bool:
    return source_type in DOC_PERMISSIONS_FUNC_MAP
