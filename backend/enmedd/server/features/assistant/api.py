from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from enmedd.auth.users import current_admin_user
from enmedd.auth.users import current_user
from enmedd.db.assistant import create_update_assistant
from enmedd.db.assistant import get_assistant_by_id
from enmedd.db.assistant import get_assistants
from enmedd.db.assistant import mark_assistant_as_deleted
from enmedd.db.assistant import mark_assistant_as_not_deleted
from enmedd.db.assistant import update_all_assistants_display_priority
from enmedd.db.assistant import update_assistant_shared_users
from enmedd.db.assistant import update_assistant_visibility
from enmedd.db.engine import get_session
from enmedd.db.models import User
from enmedd.llm.answering.prompts.utils import build_dummy_prompt
from enmedd.server.features.assistant.models import AssistantSnapshot
from enmedd.server.features.assistant.models import CreateAssistantRequest
from enmedd.server.features.assistant.models import PromptTemplateResponse
from enmedd.server.models import DisplayPriorityRequest
from enmedd.utils.logger import setup_logger

logger = setup_logger()


admin_router = APIRouter(prefix="/admin/assistant")
basic_router = APIRouter(prefix="/assistant")


class IsVisibleRequest(BaseModel):
    is_visible: bool


@admin_router.patch("/{assistant_id}/visible")
def patch_assistant_visibility(
    assistant_id: int,
    is_visible_request: IsVisibleRequest,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    update_assistant_visibility(
        assistant_id=assistant_id,
        is_visible=is_visible_request.is_visible,
        db_session=db_session,
    )


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


@admin_router.get("")
def list_assistants_admin(
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
    include_deleted: bool = False,
) -> list[AssistantSnapshot]:
    return [
        AssistantSnapshot.from_model(assistant)
        for assistant in get_assistants(
            db_session=db_session,
            user_id=None,  # user_id = None -> give back all assistants
            include_deleted=include_deleted,
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


class AssistantShareRequest(BaseModel):
    user_ids: list[UUID]


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
) -> list[AssistantSnapshot]:
    user_id = user.id if user is not None else None
    return [
        AssistantSnapshot.from_model(assistant)
        for assistant in get_assistants(
            user_id=user_id, include_deleted=include_deleted, db_session=db_session
        )
    ]


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
