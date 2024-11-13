import math
from http import HTTPStatus

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ee.enmedd.background.task_name_builders import (
    name_sync_external_doc_permissions_task,
)
from ee.enmedd.db.teamspace import validate_user_creation_permissions
from enmedd.auth.users import current_user
from enmedd.auth.users import current_workspace_admin_user
from enmedd.background.celery.celery_utils import get_deletion_attempt_snapshot
from enmedd.background.celery.celery_utils import skip_cc_pair_pruning_by_task
from enmedd.background.task_utils import name_cc_prune_task
from enmedd.db.connector_credential_pair import add_credential_to_connector
from enmedd.db.connector_credential_pair import get_connector_credential_pair_from_id
from enmedd.db.connector_credential_pair import remove_credential_from_connector
from enmedd.db.connector_credential_pair import (
    update_connector_credential_pair_from_id,
)
from enmedd.db.document import get_document_counts_for_cc_pairs
from enmedd.db.engine import get_session
from enmedd.db.enums import ConnectorCredentialPairStatus
from enmedd.db.index_attempt import cancel_indexing_attempts_for_ccpair
from enmedd.db.index_attempt import cancel_indexing_attempts_past_model
from enmedd.db.index_attempt import count_index_attempts_for_connector
from enmedd.db.index_attempt import get_latest_index_attempt_for_cc_pair_id
from enmedd.db.index_attempt import get_paginated_index_attempts_for_cc_pair_id
from enmedd.db.models import User
from enmedd.db.tasks import check_task_is_live_and_not_timed_out
from enmedd.db.tasks import get_latest_task
from enmedd.server.documents.models import CCPairFullInfo
from enmedd.server.documents.models import CCStatusUpdateRequest
from enmedd.server.documents.models import CeleryTaskStatus
from enmedd.server.documents.models import ConnectorCredentialPairIdentifier
from enmedd.server.documents.models import ConnectorCredentialPairMetadata
from enmedd.server.documents.models import PaginatedIndexAttempts
from enmedd.server.models import StatusResponse
from enmedd.utils.logger import setup_logger

logger = setup_logger()
router = APIRouter(prefix="/manage")


@router.get("/admin/cc-pair/{cc_pair_id}/index-attempts")
def get_cc_pair_index_attempts(
    cc_pair_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=1000),
    user: User | None = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> PaginatedIndexAttempts:
    cc_pair = get_connector_credential_pair_from_id(
        cc_pair_id, db_session, user, get_editable=False
    )
    if not cc_pair:
        raise HTTPException(
            status_code=400, detail="CC Pair not found for current user permissions"
        )
    total_count = count_index_attempts_for_connector(
        db_session=db_session,
        connector_id=cc_pair.connector_id,
    )
    index_attempts = get_paginated_index_attempts_for_cc_pair_id(
        db_session=db_session,
        connector_id=cc_pair.connector_id,
        page=page,
        page_size=page_size,
    )
    return PaginatedIndexAttempts.from_models(
        index_attempt_models=index_attempts,
        page=page,
        total_pages=math.ceil(total_count / page_size),
    )


@router.get("/admin/cc-pair/{cc_pair_id}")
def get_cc_pair_full_info(
    cc_pair_id: int,
    user: User | None = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> CCPairFullInfo:
    cc_pair = get_connector_credential_pair_from_id(
        cc_pair_id, db_session, user, get_editable=False
    )
    if not cc_pair:
        raise HTTPException(
            status_code=404, detail="CC Pair not found for current user permissions"
        )
    editable_cc_pair = get_connector_credential_pair_from_id(
        cc_pair_id, db_session, user, get_editable=True
    )
    is_editable_for_current_user = editable_cc_pair is not None

    cc_pair_identifier = ConnectorCredentialPairIdentifier(
        connector_id=cc_pair.connector_id,
        credential_id=cc_pair.credential_id,
    )

    document_count_info_list = list(
        get_document_counts_for_cc_pairs(
            db_session=db_session,
            cc_pair_identifiers=[cc_pair_identifier],
        )
    )
    documents_indexed = (
        document_count_info_list[0][-1] if document_count_info_list else 0
    )

    latest_attempt = get_latest_index_attempt_for_cc_pair_id(
        db_session=db_session,
        connector_credential_pair_id=cc_pair.id,
        secondary_index=False,
        only_finished=False,
    )

    return CCPairFullInfo.from_models(
        cc_pair_model=cc_pair,
        number_of_index_attempts=count_index_attempts_for_connector(
            db_session=db_session,
            connector_id=cc_pair.connector_id,
        ),
        last_index_attempt=latest_attempt,
        latest_deletion_attempt=get_deletion_attempt_snapshot(
            connector_id=cc_pair.connector_id,
            credential_id=cc_pair.credential_id,
            db_session=db_session,
        ),
        num_docs_indexed=documents_indexed,
        is_editable_for_current_user=is_editable_for_current_user,
    )


@router.put("/admin/cc-pair/{cc_pair_id}/status")
def update_cc_pair_status(
    cc_pair_id: int,
    status_update_request: CCStatusUpdateRequest,
    user: User | None = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    cc_pair = get_connector_credential_pair_from_id(
        cc_pair_id=cc_pair_id,
        db_session=db_session,
        user=user,
        get_editable=True,
    )
    if not cc_pair:
        raise HTTPException(
            status_code=400,
            detail="Connection not found for current user's permissions",
        )

    if status_update_request.status == ConnectorCredentialPairStatus.PAUSED:
        cancel_indexing_attempts_for_ccpair(cc_pair_id, db_session)

        # Just for good measure
        cancel_indexing_attempts_past_model(db_session)

    update_connector_credential_pair_from_id(
        db_session=db_session,
        cc_pair_id=cc_pair_id,
        status=status_update_request.status,
    )


@router.put("/admin/cc-pair/{cc_pair_id}/name")
def update_cc_pair_name(
    cc_pair_id: int,
    new_name: str,
    user: User | None = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[int]:
    cc_pair = get_connector_credential_pair_from_id(
        cc_pair_id=cc_pair_id,
        db_session=db_session,
        user=user,
        get_editable=True,
    )
    if not cc_pair:
        raise HTTPException(
            status_code=400, detail="CC Pair not found for current user's permissions"
        )

    try:
        cc_pair.name = new_name
        db_session.commit()
        return StatusResponse(
            success=True, message="Name updated successfully", data=cc_pair_id
        )
    except IntegrityError:
        db_session.rollback()
        raise HTTPException(status_code=400, detail="Name must be unique")


@router.get("/admin/cc-pair/{cc_pair_id}/prune")
def get_cc_pair_latest_prune(
    cc_pair_id: int,
    user: User = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> CeleryTaskStatus:
    cc_pair = get_connector_credential_pair_from_id(
        cc_pair_id=cc_pair_id,
        db_session=db_session,
        user=user,
        get_editable=False,
    )
    if not cc_pair:
        raise HTTPException(
            status_code=400,
            detail="Connection not found for current user's permissions",
        )

    # look up the last prune task for this connector (if it exists)
    pruning_task_name = name_cc_prune_task(
        connector_id=cc_pair.connector_id, credential_id=cc_pair.credential_id
    )
    last_pruning_task = get_latest_task(pruning_task_name, db_session)
    if not last_pruning_task:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="No pruning task found.",
        )

    return CeleryTaskStatus(
        id=last_pruning_task.task_id,
        name=last_pruning_task.task_name,
        status=last_pruning_task.status,
        start_time=last_pruning_task.start_time,
        register_time=last_pruning_task.register_time,
    )


@router.post("/admin/cc-pair/{cc_pair_id}/prune")
def prune_cc_pair(
    cc_pair_id: int,
    user: User = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[list[int]]:
    # avoiding circular refs
    from enmedd.background.celery.tasks.pruning.tasks import prune_documents_task

    cc_pair = get_connector_credential_pair_from_id(
        cc_pair_id=cc_pair_id,
        db_session=db_session,
        user=user,
        get_editable=False,
    )
    if not cc_pair:
        raise HTTPException(
            status_code=400,
            detail="Connection not found for current user's permissions",
        )

    pruning_task_name = name_cc_prune_task(
        connector_id=cc_pair.connector_id, credential_id=cc_pair.credential_id
    )
    last_pruning_task = get_latest_task(pruning_task_name, db_session)
    if skip_cc_pair_pruning_by_task(
        last_pruning_task,
        db_session=db_session,
    ):
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail="Pruning task already in progress.",
        )

    logger.info(f"Pruning the {cc_pair.connector.name} connector.")
    prune_documents_task.apply_async(
        kwargs=dict(
            connector_id=cc_pair.connector.id,
            credential_id=cc_pair.credential.id,
        )
    )

    return StatusResponse(
        success=True,
        message="Successfully created the pruning task.",
    )


@router.get("/admin/cc-pair/{cc_pair_id}/sync")
def get_cc_pair_latest_sync(
    cc_pair_id: int,
    user: User = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> CeleryTaskStatus:
    cc_pair = get_connector_credential_pair_from_id(
        cc_pair_id=cc_pair_id,
        db_session=db_session,
        user=user,
        get_editable=False,
    )
    if not cc_pair:
        raise HTTPException(
            status_code=400,
            detail="Connection not found for current user's permissions",
        )

    # look up the last sync task for this connector (if it exists)
    sync_task_name = name_sync_external_doc_permissions_task(cc_pair_id=cc_pair_id)
    last_sync_task = get_latest_task(sync_task_name, db_session)
    if not last_sync_task:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="No sync task found.",
        )

    return CeleryTaskStatus(
        id=last_sync_task.task_id,
        name=last_sync_task.task_name,
        status=last_sync_task.status,
        start_time=last_sync_task.start_time,
        register_time=last_sync_task.register_time,
    )


@router.post("/admin/cc-pair/{cc_pair_id}/sync")
def sync_cc_pair(
    cc_pair_id: int,
    user: User = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[list[int]]:
    # avoiding circular refs
    from ee.enmedd.background.celery.celery_app import (
        sync_external_doc_permissions_task,
    )

    cc_pair = get_connector_credential_pair_from_id(
        cc_pair_id=cc_pair_id,
        db_session=db_session,
        user=user,
        get_editable=False,
    )
    if not cc_pair:
        raise HTTPException(
            status_code=400,
            detail="Connection not found for current user's permissions",
        )

    sync_task_name = name_sync_external_doc_permissions_task(cc_pair_id=cc_pair_id)
    last_sync_task = get_latest_task(sync_task_name, db_session)

    if last_sync_task and check_task_is_live_and_not_timed_out(
        last_sync_task, db_session
    ):
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail="Sync task already in progress.",
        )
    if skip_cc_pair_pruning_by_task(
        last_sync_task,
        db_session=db_session,
    ):
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail="Sync task already in progress.",
        )

    logger.info(f"Syncing the {cc_pair.connector.name} connector.")
    sync_external_doc_permissions_task.apply_async(
        kwargs=dict(cc_pair_id=cc_pair_id),
    )

    return StatusResponse(
        success=True,
        message="Successfully created the sync task.",
    )


@router.put("/connector/{connector_id}/credential/{credential_id}")
def associate_credential_to_connector(
    connector_id: int,
    credential_id: int,
    metadata: ConnectorCredentialPairMetadata,
    user: User | None = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[int]:
    validate_user_creation_permissions(
        db_session=db_session,
        user=user,
        target_group_ids=metadata.groups,
    )

    try:
        response = add_credential_to_connector(
            db_session=db_session,
            user=user,
            connector_id=connector_id,
            credential_id=credential_id,
            cc_pair_name=metadata.name,
            access_type=metadata.access_type,
            auto_sync_options=metadata.auto_sync_options,
            groups=metadata.groups,
        )

        return response
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Name must be unique")


@router.delete("/connector/{connector_id}/credential/{credential_id}")
def dissociate_credential_from_connector(
    connector_id: int,
    credential_id: int,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[int]:
    return remove_credential_from_connector(
        connector_id, credential_id, user, db_session
    )