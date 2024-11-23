from typing import Any
from typing import cast
from typing import Dict
from typing import List

import pytest
from requests.exceptions import HTTPError

from danswer.file_store.models import ChatFileType
from danswer.file_store.models import FileDescriptor
from danswer.tools.models import ToolResponse
from danswer.tools.tool_implementations.custom.custom_tool import (
    build_custom_tools_from_openapi_schema_and_headers,
)
from danswer.tools.tool_implementations.custom.custom_tool import (
    CUSTOM_TOOL_RESPONSE_ID,
)
from danswer.tools.tool_implementations.custom.custom_tool import CustomToolCallSummary
from danswer.tools.tool_implementations.custom.custom_tool import CustomToolResponseType
from danswer.tools.tool_runner import ToolRunner
from tests.integration.common_utils.managers.tool import ToolManager
from tests.integration.common_utils.test_models import DATestTool
from tests.integration.common_utils.test_models import DATestUser


def create_and_verify_custom_tool(
    tool_definition: Dict[str, Any], user: DATestUser, name: str, description: str
) -> DATestTool:
    """Create and verify a custom tool."""
    try:
        print(f"Attempting to create custom tool '{name}'...")
        custom_tool: DATestTool = ToolManager.create(
            name=name,
            description=description,
            definition=tool_definition,
            custom_headers=[],
            user_performing_action=user,
        )
        print(f"Custom tool '{name}' created successfully with ID: {custom_tool.id}")
    except HTTPError as e:
        pytest.fail(f"Failed to create custom tool '{name}': {e}")

    # Verify the tool was created successfully
    assert ToolManager.verify(custom_tool, user_performing_action=user)
    print(f"Custom tool '{name}' verified successfully")
    return custom_tool


def build_and_run_tool(
    tool_definition: Dict[str, Any], tool_args: Dict[str, Any]
) -> List[Any]:
    """Build and run the custom tool."""
    # Build the custom tool from the definition
    custom_tools = build_custom_tools_from_openapi_schema_and_headers(
        openapi_schema=tool_definition,
        custom_headers=[],
    )

    # Ensure only one tool was built
    assert len(custom_tools) == 1
    tool = custom_tools[0]

    # Run the tool using ToolRunner
    tool_runner = ToolRunner(tool=tool, args=tool_args)
    return list(tool_runner.tool_responses())


def process_tool_responses(tool_responses: List[Any]) -> None:
    assert len(tool_responses) > 0
    for packet in tool_responses:
        if isinstance(packet, ToolResponse) and packet.id == CUSTOM_TOOL_RESPONSE_ID:
            custom_tool_response = cast(CustomToolCallSummary, packet.response)

            if custom_tool_response.response_type in (
                CustomToolResponseType.CSV,
                CustomToolResponseType.IMAGE,
            ):
                file_ids = custom_tool_response.tool_result.file_ids
                ai_message_files = [
                    FileDescriptor(
                        id=str(file_id),
                        type=ChatFileType.IMAGE
                        if custom_tool_response.response_type
                        == CustomToolResponseType.IMAGE
                        else ChatFileType.CSV,
                    )
                    for file_id in file_ids
                ]
                print(f"Received file IDs: {[str(file_id) for file_id in file_ids]}")
                assert len(file_ids) > 0
                assert all(isinstance(file_id, str) for file_id in file_ids)
                assert len(ai_message_files) == len(file_ids)
                # Additional processing can be added here if needed
            else:
                custom_tool_result = custom_tool_response.tool_result
                tool_name = custom_tool_response.tool_name
                print(f"Custom tool '{tool_name}' response: {custom_tool_result}")
                assert custom_tool_result is not None
                assert tool_name is not None
                # Additional processing can be added here if needed
        else:
            print(f"Received unexpected packet: {packet}")
