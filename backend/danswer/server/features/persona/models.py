from pydantic import BaseModel

from danswer.db.models import Persona
from danswer.search.models import RecencyBiasSetting
from danswer.server.features.document_set.models import DocumentSet
from danswer.server.features.prompt.models import PromptSnapshot


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
    shared: bool
    is_visible: bool
    display_priority: int | None
    description: str
    num_chunks: float | None
    llm_relevance_filter: bool
    llm_filter_extraction: bool
    llm_model_version_override: str | None
    default_persona: bool
    prompts: list[PromptSnapshot]
    document_sets: list[DocumentSet]

    @classmethod
    def from_model(cls, persona: Persona) -> "PersonaSnapshot":
        if persona.deleted:
            raise ValueError("Persona has been deleted")

        return PersonaSnapshot(
            id=persona.id,
            name=persona.name,
            shared=persona.user_id is None,
            is_visible=persona.is_visible,
            display_priority=persona.display_priority,
            description=persona.description,
            num_chunks=persona.num_chunks,
            llm_relevance_filter=persona.llm_relevance_filter,
            llm_filter_extraction=persona.llm_filter_extraction,
            llm_model_version_override=persona.llm_model_version_override,
            default_persona=persona.default_persona,
            prompts=[PromptSnapshot.from_model(prompt) for prompt in persona.prompts],
            document_sets=[
                DocumentSet.from_model(document_set_model)
                for document_set_model in persona.document_sets
            ],
        )


class PromptTemplateResponse(BaseModel):
    final_prompt_template: str
