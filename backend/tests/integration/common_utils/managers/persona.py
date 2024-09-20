from uuid import uuid4

import requests
from onyx.search.enums import RecencyBiasSetting
from onyx.server.features.persona.models import PersonaSnapshot

from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.test_models import TestPersona
from tests.integration.common_utils.test_models import TestUser


class PersonaManager:
    @staticmethod
    def create(
        name: str | None = None,
        description: str | None = None,
        num_chunks: float = 5,
        llm_relevance_filter: bool = True,
        is_public: bool = True,
        llm_filter_extraction: bool = True,
        recency_bias: RecencyBiasSetting = RecencyBiasSetting.AUTO,
        prompt_ids: list[int] | None = None,
        document_set_ids: list[int] | None = None,
        tool_ids: list[int] | None = None,
        llm_model_provider_override: str | None = None,
        llm_model_version_override: str | None = None,
        users: list[str] | None = None,
        groups: list[int] | None = None,
        user_performing_action: TestUser | None = None,
    ) -> TestPersona:
        name = name or f"test-persona-{uuid4()}"
        description = description or f"Description for {name}"

        persona_creation_request = {
            "name": name,
            "description": description,
            "num_chunks": num_chunks,
            "llm_relevance_filter": llm_relevance_filter,
            "is_public": is_public,
            "llm_filter_extraction": llm_filter_extraction,
            "recency_bias": recency_bias,
            "prompt_ids": prompt_ids or [],
            "document_set_ids": document_set_ids or [],
            "tool_ids": tool_ids or [],
            "llm_model_provider_override": llm_model_provider_override,
            "llm_model_version_override": llm_model_version_override,
            "users": users or [],
            "groups": groups or [],
        }

        response = requests.post(
            f"{API_SERVER_URL}/persona",
            json=persona_creation_request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        persona_data = response.json()

        return TestPersona(
            id=persona_data["id"],
            name=name,
            description=description,
            num_chunks=num_chunks,
            llm_relevance_filter=llm_relevance_filter,
            is_public=is_public,
            llm_filter_extraction=llm_filter_extraction,
            recency_bias=recency_bias,
            prompt_ids=prompt_ids or [],
            document_set_ids=document_set_ids or [],
            tool_ids=tool_ids or [],
            llm_model_provider_override=llm_model_provider_override,
            llm_model_version_override=llm_model_version_override,
            users=users or [],
            groups=groups or [],
        )

    @staticmethod
    def edit(
        persona: TestPersona,
        name: str | None = None,
        description: str | None = None,
        num_chunks: float | None = None,
        llm_relevance_filter: bool | None = None,
        is_public: bool | None = None,
        llm_filter_extraction: bool | None = None,
        recency_bias: RecencyBiasSetting | None = None,
        prompt_ids: list[int] | None = None,
        document_set_ids: list[int] | None = None,
        tool_ids: list[int] | None = None,
        llm_model_provider_override: str | None = None,
        llm_model_version_override: str | None = None,
        users: list[str] | None = None,
        groups: list[int] | None = None,
        user_performing_action: TestUser | None = None,
    ) -> TestPersona:
        persona_update_request = {
            "name": name or persona.name,
            "description": description or persona.description,
            "num_chunks": num_chunks or persona.num_chunks,
            "llm_relevance_filter": llm_relevance_filter
            or persona.llm_relevance_filter,
            "is_public": is_public or persona.is_public,
            "llm_filter_extraction": llm_filter_extraction
            or persona.llm_filter_extraction,
            "recency_bias": recency_bias or persona.recency_bias,
            "prompt_ids": prompt_ids or persona.prompt_ids,
            "document_set_ids": document_set_ids or persona.document_set_ids,
            "tool_ids": tool_ids or persona.tool_ids,
            "llm_model_provider_override": llm_model_provider_override
            or persona.llm_model_provider_override,
            "llm_model_version_override": llm_model_version_override
            or persona.llm_model_version_override,
            "users": users or persona.users,
            "groups": groups or persona.groups,
        }

        response = requests.patch(
            f"{API_SERVER_URL}/persona/{persona.id}",
            json=persona_update_request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        updated_persona_data = response.json()

        return TestPersona(
            id=updated_persona_data["id"],
            name=updated_persona_data["name"],
            description=updated_persona_data["description"],
            num_chunks=updated_persona_data["num_chunks"],
            llm_relevance_filter=updated_persona_data["llm_relevance_filter"],
            is_public=updated_persona_data["is_public"],
            llm_filter_extraction=updated_persona_data["llm_filter_extraction"],
            recency_bias=updated_persona_data["recency_bias"],
            prompt_ids=updated_persona_data["prompts"],
            document_set_ids=updated_persona_data["document_sets"],
            tool_ids=updated_persona_data["tools"],
            llm_model_provider_override=updated_persona_data[
                "llm_model_provider_override"
            ],
            llm_model_version_override=updated_persona_data[
                "llm_model_version_override"
            ],
            users=[user["email"] for user in updated_persona_data["users"]],
            groups=updated_persona_data["groups"],
        )

    @staticmethod
    def get_all(
        user_performing_action: TestUser | None = None,
    ) -> list[PersonaSnapshot]:
        response = requests.get(
            f"{API_SERVER_URL}/admin/persona",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        return [PersonaSnapshot(**persona) for persona in response.json()]

    @staticmethod
    def verify(
        test_persona: TestPersona,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        all_personas = PersonaManager.get_all(user_performing_action)
        for persona in all_personas:
            if persona.id == test_persona.id:
                return (
                    persona.name == test_persona.name
                    and persona.description == test_persona.description
                    and persona.num_chunks == test_persona.num_chunks
                    and persona.llm_relevance_filter
                    == test_persona.llm_relevance_filter
                    and persona.is_public == test_persona.is_public
                    and persona.llm_filter_extraction
                    == test_persona.llm_filter_extraction
                    and persona.llm_model_provider_override
                    == test_persona.llm_model_provider_override
                    and persona.llm_model_version_override
                    == test_persona.llm_model_version_override
                    and set(persona.prompts) == set(test_persona.prompt_ids)
                    and set(persona.document_sets) == set(test_persona.document_set_ids)
                    and set(persona.tools) == set(test_persona.tool_ids)
                    and set(user.email for user in persona.users)
                    == set(test_persona.users)
                    and set(persona.groups) == set(test_persona.groups)
                )
        return False

    @staticmethod
    def delete(
        persona: TestPersona,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        response = requests.delete(
            f"{API_SERVER_URL}/persona/{persona.id}",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        return response.ok
