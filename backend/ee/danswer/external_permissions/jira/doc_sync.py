from jira import JIRA
from jira.resources import PermissionScheme

from danswer.access.models import DocExternalAccess
from danswer.access.models import ExternalAccess
from danswer.connectors.danswer_jira.connector import JiraConnector
from danswer.connectors.danswer_jira.utils import extract_jira_project
from danswer.db.models import ConnectorCredentialPair
from danswer.utils.logger import setup_logger

logger = setup_logger()


def _get_project_permissions(
    jira_client: JIRA,
    jira_project_key: str,
) -> ExternalAccess:
    project_permissions = jira_client._find_for_resource(
        resource_cls=PermissionScheme,
        ids=jira_project_key,
        expand="permissions,user,group",
    )

    print(project_permissions)

    user_emails = set()
    # Jira enforces that group names are unique
    group_names = set()
    is_externally_public = False
    for permission in project_permissions:
        subs = permission.get("subjects")
        if subs:
            # If there are subjects, then there are explicit users or groups with access
            if email := subs.get("user", {}).get("results", [{}])[0].get("email"):
                user_emails.add(email)
            if group_name := subs.get("group", {}).get("results", [{}])[0].get("name"):
                group_names.add(group_name)
        else:
            # If there are no subjects, then the permission is for everyone
            if permission.get("operation", {}).get(
                "operation"
            ) == "read" and permission.get("anonymousAccess", False):
                # If the permission specifies read access for anonymous users, then
                # the space is publicly accessible
                is_externally_public = True
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
    jira_document_ids = jira_connector.retrieve_all_slim_documents()

    doc_permissions: list[DocExternalAccess] = []
    for slim_doc_batch in jira_document_ids:
        for slim_doc in slim_doc_batch:
            doc_permissions.append(
                DocExternalAccess(
                    doc_id=slim_doc.id,
                    external_access=project_permissions,
                )
            )
    return doc_permissions
