from typing import Optional

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from sqlalchemy.orm import Session

from ee.enmedd.db.teamspace import validate_user_creation_permissions
from enmedd.auth.users import current_teamspace_admin_user
from enmedd.auth.users import current_user
from enmedd.auth.users import current_workspace_admin_user
from enmedd.db.document_set import check_document_sets_are_public
from enmedd.db.document_set import fetch_all_document_sets
from enmedd.db.document_set import fetch_document_sets_by_teamspace
from enmedd.db.document_set import fetch_document_sets_by_teamspace_non_admin
from enmedd.db.document_set import fetch_user_document_sets
from enmedd.db.document_set import insert_document_set
from enmedd.db.document_set import mark_document_set_as_to_be_deleted
from enmedd.db.document_set import update_document_set
from enmedd.db.engine import get_session
from enmedd.db.models import User
from enmedd.server.documents.models import ConnectorCredentialPairDescriptor
from enmedd.server.documents.models import ConnectorSnapshot
from enmedd.server.documents.models import CredentialSnapshot
from enmedd.server.features.document_set.models import CheckDocSetPublicRequest
from enmedd.server.features.document_set.models import CheckDocSetPublicResponse
from enmedd.server.features.document_set.models import DocumentSet
from enmedd.server.features.document_set.models import DocumentSetCreationRequest
from enmedd.server.features.document_set.models import DocumentSetUpdateRequest


router = APIRouter(prefix="/manage")


@router.post("/admin/document-set")
def create_document_set(
    document_set_creation_request: DocumentSetCreationRequest,
    user: User = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> int:
    validate_user_creation_permissions(
        db_session=db_session,
        user=user,
        target_group_ids=document_set_creation_request.groups,
    )
    try:
        document_set_db_model, _ = insert_document_set(
            document_set_creation_request=document_set_creation_request,
            user_id=user.id if user else None,
            db_session=db_session,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return document_set_db_model.id


@router.patch("/admin/document-set")
def patch_document_set(
    document_set_update_request: DocumentSetUpdateRequest,
    user: User = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    validate_user_creation_permissions(
        db_session=db_session,
        user=user,
        target_group_ids=document_set_update_request.groups,
    )
    try:
        update_document_set(
            document_set_update_request=document_set_update_request,
            db_session=db_session,
            user=user,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/admin/document-set/{document_set_id}")
def delete_document_set(
    document_set_id: int,
    teamspace_id: Optional[int] = None,
    user: User = Depends(current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    try:
        mark_document_set_as_to_be_deleted(
            db_session=db_session,
            teamspace_id=teamspace_id,
            document_set_id=document_set_id,
            user=user,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/document-set")
def list_document_sets_admin(
    teamspace_id: Optional[int] = None,
    _: User | None = Depends(current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
) -> list[DocumentSet]:
    if teamspace_id:
        return [
            DocumentSet.from_model(ds)
            for ds in fetch_document_sets_by_teamspace(teamspace_id, db_session)
        ]
    else:
        return [
            DocumentSet.from_model(ds)
            for ds in fetch_all_document_sets(db_session=db_session)
        ]


"""Endpoints for non-admins"""


@router.get("/document-set")
def list_document_sets(
    teamspace_id: Optional[int] = None,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
    get_editable: bool = Query(
        False, description="If true, return editable document sets"
    ),
) -> list[DocumentSet]:
    if teamspace_id:
        document_set_info = fetch_document_sets_by_teamspace_non_admin(
            teamspace_id=teamspace_id, db_session=db_session
        )
    else:
        document_set_info = fetch_user_document_sets(
            user_id=user.id if user else None, db_session=db_session
        )

    return [
        DocumentSet(
            id=document_set_db_model.id,
            name=document_set_db_model.name,
            description=document_set_db_model.description,
            contains_non_public=any(
                [not cc_pair.access_type == "public" for cc_pair in cc_pairs]
            ),
            cc_pair_descriptors=[
                ConnectorCredentialPairDescriptor(
                    id=cc_pair.id,
                    name=cc_pair.name,
                    connector=ConnectorSnapshot.from_connector_db_model(
                        cc_pair.connector
                    ),
                    credential=CredentialSnapshot.from_credential_db_model(
                        cc_pair.credential
                    ),
                )
                for cc_pair in cc_pairs
            ],
            is_up_to_date=document_set_db_model.is_up_to_date,
            is_public=document_set_db_model.is_public,
            users=[user.id for user in document_set_db_model.users],
        )
        for document_set_db_model, cc_pairs in document_set_info
    ]


@router.get("/document-set-public")
def document_set_public(
    check_public_request: CheckDocSetPublicRequest,
    _: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> CheckDocSetPublicResponse:
    is_public = check_document_sets_are_public(
        document_set_ids=check_public_request.document_set_ids, db_session=db_session
    )
    return CheckDocSetPublicResponse(is_public=is_public)
