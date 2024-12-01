from uuid import uuid4

import requests

from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.test_models import DATestTool
from tests.integration.common_utils.test_models import DATestUser


class ToolManager:
    @staticmethod
    def create(
        name: str | None = None,
        description: str | None = None,
        definition: dict | None = None,
        custom_headers: list[dict[str, str]] | None = None,
        user_performing_action: DATestUser | None = None,
    ) -> DATestTool:
        name = name or f"test-tool-{uuid4()}"
        description = description or f"Description for {name}"
        definition = definition or {}

        # Validate the tool definition before creating
        validate_response = requests.post(
            f"{API_SERVER_URL}/admin/tool/custom/validate",
            json={"definition": definition},
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        if validate_response.status_code != 200:
            raise Exception(
                f"Tool validation failed: {validate_response.json().get('detail', 'Unknown error')}"
            )

        tool_creation_request = {
            "name": name,
            "description": description,
            "definition": definition,
        }

        if custom_headers is not None:
            tool_creation_request["custom_headers"] = custom_headers

        response = requests.post(
            f"{API_SERVER_URL}/admin/tool/custom",
            json=tool_creation_request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )

        if response.status_code == 400:
            raise Exception(
                f"Tool creation failed: {response.json().get('detail', 'Unknown error')}"
            )

        response.raise_for_status()
        tool_data = response.json()

        return DATestTool(
            id=tool_data["id"],
            name=tool_data["name"],
            description=tool_data["description"],
            definition=tool_data["definition"],
            custom_headers=tool_data.get("custom_headers", []),
        )

    @staticmethod
    def edit(
        tool: DATestTool,
        name: str | None = None,
        description: str | None = None,
        definition: dict | None = None,
        custom_headers: dict[str, str] | None = None,
        user_performing_action: DATestUser | None = None,
    ) -> DATestTool:
        tool_update_request = {
            "name": name or tool.name,
            "description": description or tool.description,
            "definition": definition or tool.definition,
            "custom_headers": custom_headers or tool.custom_headers,
        }

        response = requests.put(
            f"{API_SERVER_URL}/admin/tool/custom/{tool.id}",
            json=tool_update_request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        updated_tool_data = response.json()

        return DATestTool(
            id=updated_tool_data["id"],
            name=updated_tool_data["name"],
            description=updated_tool_data["description"],
            definition=updated_tool_data["definition"],
            custom_headers=updated_tool_data.get("custom_headers", []),
        )

    @staticmethod
    def get_all(
        user_performing_action: DATestUser | None = None,
    ) -> list[DATestTool]:
        response = requests.get(
            f"{API_SERVER_URL}/tool",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        return [
            DATestTool(
                id=tool["id"],
                name=tool["name"],
                description=tool.get("description", ""),
                definition=tool.get("definition") or {},
                custom_headers=tool.get("custom_headers") or [],
            )
            for tool in response.json()
        ]

    @staticmethod
    def verify(
        tool: DATestTool,
        user_performing_action: DATestUser | None = None,
    ) -> bool:
        all_tools = ToolManager.get_all(user_performing_action)
        for fetched_tool in all_tools:
            if fetched_tool.id == tool.id:
                return (
                    fetched_tool.name == tool.name
                    and fetched_tool.description == tool.description
                    and fetched_tool.definition == tool.definition
                    and fetched_tool.custom_headers == tool.custom_headers
                )
        return False

    @staticmethod
    def delete(
        tool: DATestTool,
        user_performing_action: DATestUser | None = None,
    ) -> bool:
        response = requests.delete(
            f"{API_SERVER_URL}/admin/tool/custom/{tool.id}",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        return response.ok
