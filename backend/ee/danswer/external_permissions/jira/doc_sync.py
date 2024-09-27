from jira import JIRA
from sqlalchemy.orm import Session

from danswer.access.models import ExternalAccess
from danswer.connectors.danswer_jira.utils import build_jira_client
from danswer.connectors.danswer_jira.utils import extract_jira_project
from danswer.connectors.factory import instantiate_connector
from danswer.connectors.interfaces import IdConnector
from danswer.connectors.models import InputType
from danswer.db.models import ConnectorCredentialPair
from danswer.db.users import batch_add_non_web_user_if_not_exists__no_commit
from danswer.utils.logger import setup_logger
from ee.danswer.db.document import upsert_document_external_perms__no_commit

logger = setup_logger()


def _get_jira_document_ids(
    db_session: Session,
    cc_pair: ConnectorCredentialPair,
) -> set[str]:
    # Get all document ids that need their permissions updated
    runnable_connector = instantiate_connector(
        db_session=db_session,
        source=cc_pair.connector.source,
        input_type=InputType.PRUNE,
        connector_specific_config=cc_pair.connector.connector_specific_config,
        credential=cc_pair.credential,
    )

    assert isinstance(runnable_connector, IdConnector)

    return runnable_connector.retrieve_all_source_ids()


def _get_project_permissions(
    db_session: Session,
    jira_client: JIRA,
    jira_project_key: str,
) -> ExternalAccess:
    project_permissions = jira_client(jira_project_key).get("permissions", [])

    user_emails = set()
    # Confluence enforces that group names are unique
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
    batch_add_non_web_user_if_not_exists__no_commit(
        db_session=db_session, emails=list(user_emails)
    )
    return ExternalAccess(
        external_user_emails=user_emails,
        external_user_group_ids=group_names,
        is_public=is_externally_public,
    )


def confluence_doc_sync(
    db_session: Session,
    cc_pair: ConnectorCredentialPair,
) -> None:
    """
    Adds the external permissions to the documents in postgres
    if the document doesn't already exists in postgres, we create
    it in postgres so that when it gets created later, the permissions are
    already populated
    """
    jira_base, jira_project_key = extract_jira_project(
        cc_pair.connector.connector_specific_config["jira_project_url"]
    )
    jira_client = build_jira_client(
        credentials=cc_pair.credential.credential_json, jira_base=jira_base
    )
    project_permissions = _get_project_permissions(
        db_session=db_session,
        jira_client=jira_client,
        jira_project_key=jira_project_key,
    )
    jira_document_ids = _get_jira_document_ids(
        db_session=db_session,
        cc_pair=cc_pair,
    )
    for doc_id in jira_document_ids:
        upsert_document_external_perms__no_commit(
            db_session=db_session,
            doc_id=doc_id,
            external_access=project_permissions,
            source_type=cc_pair.connector.source,
        )
