from collections.abc import Callable

from danswer.access.models import DocExternalAccess
from danswer.configs.constants import DocumentSource
from danswer.db.models import ConnectorCredentialPair
from ee.danswer.db.external_perm import ExternalUserGroup
from ee.danswer.external_permissions.confluence.doc_sync import confluence_doc_sync
from ee.danswer.external_permissions.confluence.group_sync import confluence_group_sync
from ee.danswer.external_permissions.gmail.doc_sync import gmail_doc_sync
from ee.danswer.external_permissions.google_drive.doc_sync import gdrive_doc_sync
from ee.danswer.external_permissions.google_drive.group_sync import gdrive_group_sync
from ee.danswer.external_permissions.jira.doc_sync import jira_doc_sync
from ee.danswer.external_permissions.slack.doc_sync import slack_doc_sync

# Defining the input/output types for the sync functions
DocSyncFuncType = Callable[
    [
        ConnectorCredentialPair,
    ],
    list[DocExternalAccess],
]

GroupSyncFuncType = Callable[
    [
        ConnectorCredentialPair,
    ],
    list[ExternalUserGroup],
]

# These functions update:
# - the user_email <-> document mapping
# - the external_user_group_id <-> document mapping
# in postgres without committing
# THIS ONE IS NECESSARY FOR AUTO SYNC TO WORK
DOC_PERMISSIONS_FUNC_MAP: dict[DocumentSource, DocSyncFuncType] = {
    DocumentSource.GOOGLE_DRIVE: gdrive_doc_sync,
    DocumentSource.CONFLUENCE: confluence_doc_sync,
    DocumentSource.SLACK: slack_doc_sync,
    DocumentSource.GMAIL: gmail_doc_sync,
    DocumentSource.JIRA: jira_doc_sync,
}

# These functions update:
# - the user_email <-> external_user_group_id mapping
# in postgres without committing
# THIS ONE IS OPTIONAL ON AN APP BY APP BASIS
GROUP_PERMISSIONS_FUNC_MAP: dict[DocumentSource, GroupSyncFuncType] = {
    DocumentSource.GOOGLE_DRIVE: gdrive_group_sync,
    DocumentSource.CONFLUENCE: confluence_group_sync,
    DocumentSource.JIRA: confluence_group_sync,
}


GROUP_PERMISSIONS_IS_CC_PAIR_AGNOSTIC: set[DocumentSource] = {
    DocumentSource.CONFLUENCE,
}


# If nothing is specified here, we run the doc_sync every time the celery beat runs
DOC_PERMISSION_SYNC_PERIODS: dict[DocumentSource, int] = {
    # Polling is not supported so we fetch all doc permissions every 5 minutes
    DocumentSource.CONFLUENCE: 5 * 60,
    DocumentSource.SLACK: 5 * 60,
}

# If nothing is specified here, we run the doc_sync every time the celery beat runs
EXTERNAL_GROUP_SYNC_PERIODS: dict[DocumentSource, int] = {
    # Polling is not supported so we fetch all group permissions every 30 minutes
    DocumentSource.GOOGLE_DRIVE: 5 * 60,
    DocumentSource.CONFLUENCE: 30 * 60,
}


def check_if_valid_sync_source(source_type: DocumentSource) -> bool:
    return source_type in DOC_PERMISSIONS_FUNC_MAP
