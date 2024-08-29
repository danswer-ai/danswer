from sqlalchemy.orm import Session

from ee.enmedd.db.teamspace import fetch_teamspaces_for_documents
from ee.enmedd.db.teamspace import fetch_teamspaces_for_user
from enmedd.access.access import (
    _get_access_for_documents as get_access_for_documents_without_groups,
)
from enmedd.access.access import _get_acl_for_user as get_acl_for_user_without_groups
from enmedd.access.models import DocumentAccess
from enmedd.access.utils import prefix_teamspace
from enmedd.db.models import User
from enmedd.server.documents.models import ConnectorCredentialPairIdentifier


def _get_access_for_documents(
    document_ids: list[str],
    db_session: Session,
    cc_pair_to_delete: ConnectorCredentialPairIdentifier | None,
) -> dict[str, DocumentAccess]:
    non_ee_access_dict = get_access_for_documents_without_groups(
        document_ids=document_ids,
        db_session=db_session,
        cc_pair_to_delete=cc_pair_to_delete,
    )
    teamspace_info = {
        document_id: group_names
        for document_id, group_names in fetch_teamspaces_for_documents(
            db_session=db_session,
            document_ids=document_ids,
            cc_pair_to_delete=cc_pair_to_delete,
        )
    }

    return {
        document_id: DocumentAccess(
            user_ids=non_ee_access.user_ids,
            teamspaces=teamspace_info.get(document_id, []),  # type: ignore
            is_public=non_ee_access.is_public,
        )
        for document_id, non_ee_access in non_ee_access_dict.items()
    }


def _get_acl_for_user(user: User | None, db_session: Session) -> set[str]:
    """Returns a list of ACL entries that the user has access to. This is meant to be
    used downstream to filter out documents that the user does not have access to. The
    user should have access to a document if at least one entry in the document's ACL
    matches one entry in the returned set.

    NOTE: is imported in enmedd.access.access by `fetch_versioned_implementation`
    DO NOT REMOVE."""
    teamspaces = fetch_teamspaces_for_user(db_session, user.id) if user else []
    return set(
        [prefix_teamspace(teamspace.name) for teamspace in teamspaces]
    ).union(get_acl_for_user_without_groups(user, db_session))
