import uuid
from typing import Optional

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from fastapi import UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from enmedd.auth.users import current_admin_user
from enmedd.auth.users import current_teamspace_admin_user
from enmedd.auth.users import current_user
from enmedd.configs.constants import FileOrigin
from enmedd.db.assistant import create_update_assistant
from enmedd.db.assistant import get_assistant_by_id
from enmedd.db.assistant import get_assistants
from enmedd.db.assistant import mark_assistant_as_deleted
from enmedd.db.assistant import mark_assistant_as_not_deleted
from enmedd.db.assistant import update_all_assistants_display_priority
from enmedd.db.assistant import update_assistant_public_status
from enmedd.db.assistant import update_assistant_shared_users
from enmedd.db.assistant import update_assistant_visibility
from enmedd.db.engine import get_session
from enmedd.db.models import User
from enmedd.file_store.file_store import get_default_file_store
from enmedd.file_store.models import ChatFileType
from enmedd.llm.answering.prompts.utils import build_dummy_prompt
from enmedd.server.features.assistant.models import AssistantShareRequest
from enmedd.server.features.assistant.models import AssistantSnapshot
from enmedd.server.features.assistant.models import CreateAssistantRequest
from enmedd.server.features.assistant.models import PromptTemplateResponse
from enmedd.server.models import DisplayPriorityRequest
from enmedd.tools.utils import is_image_generation_available
from enmedd.utils.logger import setup_logger

logger = setup_logger()


admin_router = APIRouter(prefix="/admin/assistant")
basic_router = APIRouter(prefix="/assistant")


class IsVisibleRequest(BaseModel):
    is_visible: bool


class IsPublicRequest(BaseModel):
    is_public: bool


@admin_router.patch("/{assistant_id}/visible")
def patch_assistant_visibility(
    assistant_id: int,
    is_visible_request: IsVisibleRequest,
    user: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    update_assistant_visibility(
        assistant_id=assistant_id,
        is_visible=is_visible_request.is_visible,
        db_session=db_session,
        user=user,
    )


@basic_router.patch("/{assistant_id}/public")
def patch_user_assistant_public_status(
    assistant_id: int,
    is_public_request: IsPublicRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    try:
        update_assistant_public_status(
            assistant_id=assistant_id,
            is_public=is_public_request.is_public,
            db_session=db_session,
            user=user,
        )
    except ValueError as e:
        logger.exception("Failed to update assistant public status")
        raise HTTPException(status_code=403, detail=str(e))


@admin_router.put("/display-priority")
def patch_assistant_display_priority(
    display_priority_request: DisplayPriorityRequest,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    update_all_assistants_display_priority(
        display_priority_map=display_priority_request.display_priority_map,
        db_session=db_session,
    )


# TODO this should be current teamspace admin user
@admin_router.get("")
def list_assistants_admin(
    user: User | None = Depends(current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
    include_deleted: bool = False,
    get_editable: bool = Query(
        False, description="If true, return editable assistants"
    ),
    teamspace_id: int | None = None,
) -> list[AssistantSnapshot]:
    return [
        AssistantSnapshot.from_model(assistant)
        for assistant in get_assistants(
            teamspace_id=teamspace_id,
            db_session=db_session,
            user=user,
            get_editable=get_editable,
            include_deleted=include_deleted,
            joinedload_all=True,
        )
    ]


@admin_router.patch("/{assistant_id}/undelete")
def undelete_assistant(
    assistant_id: int,
    user: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    mark_assistant_as_not_deleted(
        assistant_id=assistant_id,
        user=user,
        db_session=db_session,
    )


# used for assistat profile pictures
@admin_router.post("/upload-image")
def upload_file(
    file: UploadFile,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_user),
) -> dict[str, str]:
    file_store = get_default_file_store(db_session)
    file_type = ChatFileType.IMAGE
    file_id = str(uuid.uuid4())
    file_store.save_file(
        file_name=file_id,
        content=file.file,
        display_name=file.filename,
        file_origin=FileOrigin.CHAT_UPLOAD,
        file_type=file.content_type or file_type.value,
    )
    return {"file_id": file_id}


"""Endpoints for all"""


@basic_router.post("")
def create_assistant(
    create_assistant_request: CreateAssistantRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> AssistantSnapshot:
    return create_update_assistant(
        assistant_id=None,
        create_assistant_request=create_assistant_request,
        user=user,
        db_session=db_session,
    )


@basic_router.patch("/{assistant_id}")
def update_assistant(
    assistant_id: int,
    update_assistant_request: CreateAssistantRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> AssistantSnapshot:
    return create_update_assistant(
        assistant_id=assistant_id,
        create_assistant_request=update_assistant_request,
        user=user,
        db_session=db_session,
    )


@basic_router.patch("/{assistant_id}/share")
def share_assistant(
    assistant_id: int,
    assistant_share_request: AssistantShareRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    update_assistant_shared_users(
        assistant_id=assistant_id,
        user_ids=assistant_share_request.user_ids,
        user=user,
        db_session=db_session,
    )


@basic_router.delete("/{assistant_id}")
def delete_assistant(
    assistant_id: int,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    mark_assistant_as_deleted(
        assistant_id=assistant_id,
        user=user,
        db_session=db_session,
    )


@basic_router.get("")
def list_assistants(
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
    include_deleted: bool = False,
    assistant_ids: list[int] = Query(None),
    teamspace_id: Optional[int] = None,
) -> list[AssistantSnapshot]:
    assistants = get_assistants(
        user=user,
        teamspace_id=teamspace_id,
        include_deleted=include_deleted,
        db_session=db_session,
        get_editable=False,
        joinedload_all=True,
    )

    if assistant_ids:
        assistants = [p for p in assistants if p.id in assistant_ids]
        print(
            f"Assistants after ID filter: {[assistant.id for assistant in assistants]}"
        )

    # Filter out assistants with unavailable tools
    assistants = [
        p
        for p in assistants
        if not (
            any(tool.in_code_tool_id == "ImageGenerationTool" for tool in p.tools)
            and not is_image_generation_available(db_session=db_session)
        )
    ]

    return [AssistantSnapshot.from_model(p) for p in assistants]


@basic_router.get("/{assistant_id}")
def get_assistant(
    assistant_id: int,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> AssistantSnapshot:
    return AssistantSnapshot.from_model(
        get_assistant_by_id(
            assistant_id=assistant_id,
            user=user,
            db_session=db_session,
            is_for_edit=False,
        )
    )


@basic_router.get("/utils/prompt-explorer")
def build_final_template_prompt(
    system_prompt: str,
    task_prompt: str,
    retrieval_disabled: bool = False,
    _: User | None = Depends(current_user),
) -> PromptTemplateResponse:
    return PromptTemplateResponse(
        final_prompt_template=build_dummy_prompt(
            system_prompt=system_prompt,
            task_prompt=task_prompt,
            retrieval_disabled=retrieval_disabled,
        )
    )
