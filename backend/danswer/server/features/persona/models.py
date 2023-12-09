from pydantic import BaseModel

from danswer.db.models import Persona
from danswer.search.models import RecencyBiasSetting
from danswer.server.features.document_set.models import DocumentSet


class CreatePersonaRequest(BaseModel):
    name: str
    description: str
    shared: bool
    num_chunks: float
    llm_relevance_filter: bool
    llm_filter_extraction: bool
    recency_bias: RecencyBiasSetting
    prompt_ids: list[int]
    document_set_ids: list[int]
    llm_model_version_override: str | None = None


class PersonaSnapshot(BaseModel):
    id: int
    name: str
    description: str
    system_prompt: str
    task_prompt: str
    num_chunks: int | None
    document_sets: list[DocumentSet]
    llm_model_version_override: str | None

    @classmethod
    def from_model(cls, persona: Persona) -> "PersonaSnapshot":
        return PersonaSnapshot(
            id=persona.id,
            name=persona.name,
            description=persona.description or "",
            system_prompt=persona.system_text or "",
            task_prompt=persona.hint_text or "",
            num_chunks=persona.num_chunks,
            document_sets=[
                DocumentSet.from_model(document_set_model)
                for document_set_model in persona.document_sets
            ],
            llm_model_version_override=persona.llm_model_version_override,
        )


class PromptTemplateResponse(BaseModel):
    final_prompt_template: str
