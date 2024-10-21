from sqlalchemy.orm import Session

from ee.enmedd.db.external_perm import fetch_external_teamspaces_for_user
from ee.enmedd.db.teamspace import fetch_teamspaces_for_documents
from ee.enmedd.db.teamspace import fetch_teamspaces_for_user
from enmedd.access.access import (
    _get_access_for_documents as get_access_for_documents_without_teamspace,
)
from enmedd.access.access import (
    _get_acl_for_user as get_acl_for_user_without_teamspaces,
)
from enmedd.access.models import DocumentAccess
from enmedd.access.utils import prefix_external_teamspace
from enmedd.access.utils import prefix_teamspace
from enmedd.db.document import get_documents_by_ids
from enmedd.db.models import User


def _get_access_for_document(
    document_id: str,
    db_session: Session,
) -> DocumentAccess:
    id_to_access = _get_access_for_documents([document_id], db_session)
    if len(id_to_access) == 0:
        return DocumentAccess.build(
            user_emails=[],
            teamspaces=[],
            external_user_emails=[],
            external_teamspace_ids=[],
            is_public=False,
        )

    return next(iter(id_to_access.values()))


def _get_access_for_documents(
    document_ids: list[str],
    db_session: Session,
) -> dict[str, DocumentAccess]:
    non_ee_access_dict = get_access_for_documents_without_teamspace(
        document_ids=document_ids,
        db_session=db_session,
    )
    teamspace_info: dict[str, list[str]] = {
        document_id: group_names
        for document_id, group_names in fetch_teamspaces_for_documents(
            db_session=db_session,
            document_ids=document_ids,
        )
    }
    documents = get_documents_by_ids(
        db_session=db_session,
        document_ids=document_ids,
    )
    doc_id_map = {doc.id: doc for doc in documents}

    access_map = {}
    for document_id, non_ee_access in non_ee_access_dict.items():
        document = doc_id_map[document_id]

        ext_u_emails = (
            set(document.external_user_emails)
            if document.external_user_emails
            else set()
        )

        ext_u_teamspaces = (
            set(document.external_teamspace_ids)
            if document.external_teamspace_ids
            else set()
        )

        # If the document is determined to be "public" externally (through a SYNC connector)
        # then it's given the same access level as if it were marked public within enMedD AI
        is_public_anywhere = document.is_public or non_ee_access.is_public

        # To avoid collisions of group namings between connectors, they need to be prefixed
        access_map[document_id] = DocumentAccess(
            user_emails=non_ee_access.user_emails,
            teamspaces=set(teamspace_info.get(document_id, [])),
            is_public=is_public_anywhere,
            external_user_emails=ext_u_emails,
            external_teamspace_ids=ext_u_teamspaces,
        )
    return access_map


def _get_acl_for_user(user: User | None, db_session: Session) -> set[str]:
    """Returns a list of ACL entries that the user has access to. This is meant to be
    used downstream to filter out documents that the user does not have access to. The
    user should have access to a document if at least one entry in the document's ACL
    matches one entry in the returned set.

    NOTE: is imported in enmedd.access.access by `fetch_versioned_implementation`
    DO NOT REMOVE."""
    db_teamspaces = fetch_teamspaces_for_user(db_session, user.id) if user else []
    prefixed_teamspaces = [
        prefix_teamspace(db_teamspace.name) for db_teamspace in db_teamspaces
    ]

    db_external_teamspaces = (
        fetch_external_teamspaces_for_user(db_session, user.id) if user else []
    )
    prefixed_external_teamspaces = [
        prefix_external_teamspace(db_external_teamspace.external_teamspace_id)
        for db_external_teamspace in db_external_teamspaces
    ]

    user_acl = set(prefixed_teamspaces + prefixed_external_teamspaces)
    user_acl.update(get_acl_for_user_without_teamspaces(user, db_session))

    return user_acl
