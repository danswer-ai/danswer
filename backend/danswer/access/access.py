from sqlalchemy.orm import Session

from danswer.access.models import DocumentAccess
from danswer.db.document import get_acccess_info_for_documents
from danswer.db.engine import get_sqlalchemy_engine
from danswer.server.models import ConnectorCredentialPairIdentifier


def _get_access_for_documents(
    document_ids: list[str],
    cc_pair_to_delete: ConnectorCredentialPairIdentifier | None,
    db_session: Session,
) -> dict[str, DocumentAccess]:
    document_access_info = get_acccess_info_for_documents(
        db_session=db_session,
        document_ids=document_ids,
        cc_pair_to_delete=cc_pair_to_delete,
    )
    return {
        document_id: DocumentAccess.build(user_ids, is_public)
        for document_id, user_ids, is_public in document_access_info
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
