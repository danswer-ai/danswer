from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.auth.users import current_user
from danswer.db.chat import fetch_persona_by_id
from danswer.db.chat import fetch_personas
from danswer.db.chat import mark_persona_as_deleted
from danswer.db.chat import upsert_persona
from danswer.db.document_set import get_document_sets_by_ids
from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.direct_qa.qa_block import PersonaBasedQAHandler
from danswer.server.persona.models import CreatePersonaRequest
from danswer.server.persona.models import PersonaSnapshot
from danswer.server.persona.models import PromptTemplateResponse


router = APIRouter()


@router.post("/admin/persona")
def create_persona(
    create_persona_request: CreatePersonaRequest,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> PersonaSnapshot:
    document_sets = list(
        get_document_sets_by_ids(
            db_session=db_session,
            document_set_ids=create_persona_request.document_set_ids,
        )
        if create_persona_request.document_set_ids
        else []
    )
    persona = upsert_persona(
        db_session=db_session,
        name=create_persona_request.name,
        description=create_persona_request.description,
        retrieval_enabled=True,
        datetime_aware=True,
        system_text=create_persona_request.system_prompt,
        hint_text=create_persona_request.task_prompt,
        document_sets=document_sets,
    )
    return PersonaSnapshot.from_model(persona)


@router.patch("/admin/persona/{persona_id}")
def update_persona(
    persona_id: int,
    update_persona_request: CreatePersonaRequest,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> PersonaSnapshot:
    document_sets = list(
        get_document_sets_by_ids(
            db_session=db_session,
            document_set_ids=update_persona_request.document_set_ids,
        )
        if update_persona_request.document_set_ids
        else []
    )
    persona = upsert_persona(
        db_session=db_session,
        name=update_persona_request.name,
        description=update_persona_request.description,
        retrieval_enabled=True,
        datetime_aware=True,
        system_text=update_persona_request.system_prompt,
        hint_text=update_persona_request.task_prompt,
        document_sets=document_sets,
        persona_id=persona_id,
    )
    return PersonaSnapshot.from_model(persona)


@router.delete("/admin/persona/{persona_id}")
def delete_persona(
    persona_id: int,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    mark_persona_as_deleted(db_session=db_session, persona_id=persona_id)


@router.get("/persona")
def list_personas(
    _: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> list[PersonaSnapshot]:
    return [
        PersonaSnapshot.from_model(persona)
        for persona in fetch_personas(db_session=db_session)
    ]


@router.get("/persona/{persona_id}")
def get_persona(
    persona_id: int,
    _: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> PersonaSnapshot:
    return PersonaSnapshot.from_model(
        fetch_persona_by_id(db_session=db_session, persona_id=persona_id)
    )


@router.get("/persona-utils/prompt-explorer")
def build_final_template_prompt(
    system_prompt: str,
    task_prompt: str,
    _: User | None = Depends(current_user),
) -> PromptTemplateResponse:
    return PromptTemplateResponse(
        final_prompt_template=PersonaBasedQAHandler(
            system_prompt=system_prompt, task_prompt=task_prompt
        ).build_dummy_prompt()
    )
