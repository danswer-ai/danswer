from collections.abc import Callable

from danswer.configs.constants import DocumentSource
from danswer.db.models import ConnectorCredentialPair
from danswer.db.models import EmailToExternalUserCache
from ee.danswer.background.models import GroupSyncRes
from ee.danswer.connectors.google_drive.perm_sync import gdrive_doc_sync
from ee.danswer.connectors.google_drive.perm_sync import gdrive_group_sync

GroupSyncType = Callable[
    [list[ConnectorCredentialPair], dict[str, EmailToExternalUserCache]], GroupSyncRes
]

DocSyncType = Callable[[], None]

CONNECTOR_PERMISSION_FUNC_MAP: dict[
    DocumentSource, tuple[GroupSyncType, DocSyncType]
] = {DocumentSource.GOOGLE_DRIVE: (gdrive_group_sync, gdrive_doc_sync)}
