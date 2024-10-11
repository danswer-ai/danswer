from sqlalchemy import select
from sqlalchemy.orm import Session

from enmedd.access.models import ExternalAccess
from enmedd.access.utils import prefix_teamspace_w_source
from enmedd.configs.constants import DocumentSource
from enmedd.db.models import Document as DbDocument


def upsert_document_external_perms__no_commit(
    db_session: Session,
    doc_id: str,
    external_access: ExternalAccess,
    source_type: DocumentSource,
) -> None:
    """
    This sets the permissions for a document in postgres.
    NOTE: this will replace any existing external access, it will not do a union
    """
    document = db_session.scalars(
        select(DbDocument).where(DbDocument.id == doc_id)
    ).first()

    prefixed_external_groups = [
        prefix_teamspace_w_source(
            ext_group_name=group_id,
            source=source_type,
        )
        for group_id in external_access.external_teamspace_ids
    ]

    if not document:
        # If the document does not exist, still store the external access
        # So that if the document is added later, the external access is already stored
        document = DbDocument(
            id=doc_id,
            semantic_id="",
            external_user_emails=external_access.external_user_emails,
            external_teamspace_ids=prefixed_external_groups,
            is_public=external_access.is_public,
        )
        db_session.add(document)
        return

    document.external_user_emails = list(external_access.external_user_emails)
    document.external_teamspace_ids = prefixed_external_groups
    document.is_public = external_access.is_public
