from uuid import uuid4

import requests

from enmedd.search.enums import RecencyBiasSetting
from enmedd.server.features.assistant.models import AssistantSnapshot
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.test_models import DATestAssistant
from tests.integration.common_utils.test_models import DATestUser


class AssistantManager:
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
        user_performing_action: DATestUser | None = None,
    ) -> DATestAssistant:
        name = name or f"test-assistant-{uuid4()}"
        description = description or f"Description for {name}"

        assistant_creation_request = {
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
            f"{API_SERVER_URL}/assistant",
            json=assistant_creation_request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        assistant_data = response.json()

        return DATestAssistant(
            id=assistant_data["id"],
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
        assistant: DATestAssistant,
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
        user_performing_action: DATestUser | None = None,
    ) -> DATestAssistant:
        assistant_update_request = {
            "name": name or assistant.name,
            "description": description or assistant.description,
            "num_chunks": num_chunks or assistant.num_chunks,
            "llm_relevance_filter": llm_relevance_filter
            or assistant.llm_relevance_filter,
            "is_public": is_public or assistant.is_public,
            "llm_filter_extraction": llm_filter_extraction
            or assistant.llm_filter_extraction,
            "recency_bias": recency_bias or assistant.recency_bias,
            "prompt_ids": prompt_ids or assistant.prompt_ids,
            "document_set_ids": document_set_ids or assistant.document_set_ids,
            "tool_ids": tool_ids or assistant.tool_ids,
            "llm_model_provider_override": llm_model_provider_override
            or assistant.llm_model_provider_override,
            "llm_model_version_override": llm_model_version_override
            or assistant.llm_model_version_override,
            "users": users or assistant.users,
            "groups": groups or assistant.groups,
        }

        response = requests.patch(
            f"{API_SERVER_URL}/assistant/{assistant.id}",
            json=assistant_update_request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        updated_assistant_data = response.json()

        return DATestAssistant(
            id=updated_assistant_data["id"],
            name=updated_assistant_data["name"],
            description=updated_assistant_data["description"],
            num_chunks=updated_assistant_data["num_chunks"],
            llm_relevance_filter=updated_assistant_data["llm_relevance_filter"],
            is_public=updated_assistant_data["is_public"],
            llm_filter_extraction=updated_assistant_data["llm_filter_extraction"],
            recency_bias=updated_assistant_data["recency_bias"],
            prompt_ids=updated_assistant_data["prompts"],
            document_set_ids=updated_assistant_data["document_sets"],
            tool_ids=updated_assistant_data["tools"],
            llm_model_provider_override=updated_assistant_data[
                "llm_model_provider_override"
            ],
            llm_model_version_override=updated_assistant_data[
                "llm_model_version_override"
            ],
            users=[user["email"] for user in updated_assistant_data["users"]],
            groups=updated_assistant_data["groups"],
        )

    @staticmethod
    def get_all(
        user_performing_action: DATestUser | None = None,
    ) -> list[AssistantSnapshot]:
        response = requests.get(
            f"{API_SERVER_URL}/admin/assistant",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        return [AssistantSnapshot(**assistant) for assistant in response.json()]

    @staticmethod
    def verify(
        assistant: DATestAssistant,
        user_performing_action: DATestUser | None = None,
    ) -> bool:
        all_assistants = AssistantManager.get_all(user_performing_action)
        for fetched_assistant in all_assistants:
            if fetched_assistant.id == assistant.id:
                return (
                    fetched_assistant.name == assistant.name
                    and fetched_assistant.description == assistant.description
                    and fetched_assistant.num_chunks == assistant.num_chunks
                    and fetched_assistant.llm_relevance_filter
                    == assistant.llm_relevance_filter
                    and fetched_assistant.is_public == assistant.is_public
                    and fetched_assistant.llm_filter_extraction
                    == assistant.llm_filter_extraction
                    and fetched_assistant.llm_model_provider_override
                    == assistant.llm_model_provider_override
                    and fetched_assistant.llm_model_version_override
                    == assistant.llm_model_version_override
                    and set([prompt.id for prompt in fetched_assistant.prompts])
                    == set(assistant.prompt_ids)
                    and set(
                        [
                            document_set.id
                            for document_set in fetched_assistant.document_sets
                        ]
                    )
                    == set(assistant.document_set_ids)
                    and set([tool.id for tool in fetched_assistant.tools])
                    == set(assistant.tool_ids)
                    and set(user.email for user in fetched_assistant.users)
                    == set(assistant.users)
                    and set(fetched_assistant.groups) == set(assistant.groups)
                )
        return False

    @staticmethod
    def delete(
        assistant: DATestAssistant,
        user_performing_action: DATestUser | None = None,
    ) -> bool:
        response = requests.delete(
            f"{API_SERVER_URL}/assistant/{assistant.id}",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        return response.ok
