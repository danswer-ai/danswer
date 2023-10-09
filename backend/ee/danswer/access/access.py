from sqlalchemy.orm import Session

from danswer.access.access import _get_acl_for_user as get_acl_for_user_without_groups
from danswer.access.access import (
    get_access_for_documents as get_access_for_documents_without_groups,
)
from danswer.access.models import DocumentAccess
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.models import User
from danswer.server.documents.models import ConnectorCredentialPairIdentifier
from ee.danswer.db.user_group import fetch_user_groups_for_documents
from ee.danswer.db.user_group import fetch_user_groups_for_user


def _get_access_for_documents(
    document_ids: list[str],
    cc_pair_to_delete: ConnectorCredentialPairIdentifier | None,
    db_session: Session,
) -> dict[str, DocumentAccess]:
    access_dict = get_access_for_documents_without_groups(
        document_ids=document_ids,
        cc_pair_to_delete=cc_pair_to_delete,
        db_session=db_session,
    )
    user_group_info = {
        document_id: group_names
        for document_id, group_names in fetch_user_groups_for_documents(
            db_session=db_session,
            document_ids=document_ids,
            cc_pair_to_delete=cc_pair_to_delete,
        )
    }

    # overload user_ids a bit - use it for both actual User IDs + group IDs
    return {
        document_id: DocumentAccess(
            user_ids=access.user_ids.union(user_group_info.get(document_id, [])),  # type: ignore
            is_public=access.is_public,
        )
        for document_id, access in access_dict.items()
    }


def get_access_for_documents(
    document_ids: list[str],
    cc_pair_to_delete: ConnectorCredentialPairIdentifier | None = None,
    db_session: Session | None = None,
) -> dict[str, DocumentAccess]:
    if db_session is None:
        with Session(get_sqlalchemy_engine()) as db_session:
            return _get_access_for_documents(
                document_ids, cc_pair_to_delete, db_session
            )

    return _get_access_for_documents(document_ids, cc_pair_to_delete, db_session)


def prefix_user_group(user_group_name: str) -> str:
    """Prefixes a user group name to eliminate collision with user IDs.
    This assumes that user ids are prefixed with a different prefix."""
    return f"group:{user_group_name}"


def _get_acl_for_user(user: User | None, db_session: Session) -> set[str]:
    """Returns a list of ACL entries that the user has access to. This is meant to be
    used downstream to filter out documents that the user does not have access to. The
    user should have access to a document if at least one entry in the document's ACL
    matches one entry in the returned set.

    NOTE: is imported in danswer.access.access by `fetch_versioned_implementation`
    DO NOT REMOVE."""
    user_groups = fetch_user_groups_for_user(db_session, user.id) if user else []
    return set(
        [prefix_user_group(user_group.name) for user_group in user_groups]
    ).union(get_acl_for_user_without_groups(user, db_session))
