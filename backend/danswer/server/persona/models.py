from pydantic import BaseModel

from danswer.db.models import Persona
from danswer.server.models import DocumentSet


class CreatePersonaRequest(BaseModel):
    name: str
    description: str
    document_set_ids: list[int]
    system_prompt: str
    task_prompt: str
    num_chunks: int | None = None
    apply_llm_relevance_filter: bool | None = None


class PersonaSnapshot(BaseModel):
    id: int
    name: str
    description: str
    system_prompt: str
    task_prompt: str
    document_sets: list[DocumentSet]

    @classmethod
    def from_model(cls, persona: Persona) -> "PersonaSnapshot":
        return PersonaSnapshot(
            id=persona.id,
            name=persona.name,
            description=persona.description or "",
            system_prompt=persona.system_text or "",
            task_prompt=persona.hint_text or "",
            document_sets=[
                DocumentSet.from_model(document_set_model)
                for document_set_model in persona.document_sets
            ],
        )


class PromptTemplateResponse(BaseModel):
    final_prompt_template: str
