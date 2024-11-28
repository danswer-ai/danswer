from jira import JIRA

from danswer.access.models import DocExternalAccess
from danswer.access.models import ExternalAccess
from danswer.connectors.danswer_jira.connector import JiraConnector
from danswer.connectors.danswer_jira.utils import extract_jira_project
from danswer.db.models import ConnectorCredentialPair
from danswer.utils.logger import setup_logger

logger = setup_logger()

# Max is 1k
_PAGE_SIZE = 1000


def _get_project_permissions(
    jira_client: JIRA,
    jira_project_key: str,
) -> ExternalAccess:
    query = {
        "query": "*",
        "projectKey": jira_project_key,
        "maxResults": _PAGE_SIZE,
        "startAt": 0,
    }

    user_emails = set()
    while True:
        result = jira_client._get_json(path="/user/viewissue/search", params=query)
        for user in result:
            if email := user.get("emailAddress"):
                user_emails.add(email)
        if len(result) < _PAGE_SIZE:
            break
        query["startAt"] += _PAGE_SIZE

    # Group names are not given space permissions, so we these are empty per document
    group_names = set()
    is_externally_public = False
    return ExternalAccess(
        external_user_emails=user_emails,
        external_user_group_ids=group_names,
        is_public=is_externally_public,
    )


def jira_doc_sync(
    cc_pair: ConnectorCredentialPair,
) -> list[DocExternalAccess]:
    """
    We assume each Jira connector has a 1-1 relationship with a Jira project
    So all documents from a Jira connector inherit the permissions of the Jira project
    """
    jira_connector = JiraConnector(**cc_pair.connector.connector_specific_config)
    jira_connector.load_credentials(cc_pair.credential.credential_json)

    _, jira_project_key = extract_jira_project(
        cc_pair.connector.connector_specific_config["jira_project_url"]
    )
    project_permissions = _get_project_permissions(
        jira_client=jira_connector.jira_client,
        jira_project_key=jira_project_key,
    )

    doc_permissions: list[DocExternalAccess] = []
    for slim_doc_batch in jira_connector.retrieve_all_slim_documents():
        for slim_doc in slim_doc_batch:
            doc_permissions.append(
                DocExternalAccess(
                    doc_id=slim_doc.id,
                    external_access=project_permissions,
                )
            )
    return doc_permissions
