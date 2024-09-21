from unittest.mock import MagicMock
from unittest.mock import patch

import pytest

from danswer.tools.custom.custom_tool import build_custom_tools_from_openapi_schema
from danswer.tools.custom.custom_tool import CustomTool
from danswer.tools.custom.openapi_parsing import MethodSpec
from danswer.tools.models import DynamicSchemaInfo


def test_custom_tool_run():
    # Mock MethodSpec
    method_spec = MagicMock(MethodSpec)
    method_spec.method = "POST"
    method_spec.build_url.return_value = "http://test-url.com/api/endpoint"
    method_spec.operation_id = "testOperation"  # Add this line
    method_spec.name = "test"
    method_spec.summary = "test"

    # Create CustomTool instance
    custom_tool = CustomTool(method_spec, "http://test-url.com")

    # Mock the requests.request function
    with patch("requests.request") as mock_request:
        # Set up the mock response
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": "success"}
        mock_request.return_value = mock_response

        # Run the tool
        result = list(custom_tool.run(request_body={"key": "value"}))

    # Assert that the request was made with correct parameters
    mock_request.assert_called_once_with(
        "POST", "http://test-url.com/api/endpoint", json={"key": "value"}
    )

    # Check the result
    assert len(result) == 1
    assert result[0].response.tool_result == {"result": "success"}


def test_build_custom_tools_with_dynamic_schema():
    openapi_schema = {
        "openapi": "3.0.0",
        "info": {"title": "Test API", "version": "1.0.0"},
        "servers": [{"url": "http://test-url.com/CHAT_SESSION_ID"}],
        "paths": {
            "/endpoint/CHAT_SESSION_ID": {
                "post": {
                    "summary": "Create a new Assistant",
                    "operationId": "testEndpoint",
                    "parameters": [],
                }
            }
        },
    }

    dynamic_schema_info = DynamicSchemaInfo(chat_session_id=123, message_id=456)

    tools = build_custom_tools_from_openapi_schema(openapi_schema, dynamic_schema_info)
    print("tools")
    print(tools)

    # assert len(tools) == 1
    # assert isinstance(tools[0], CustomTool)

    # # Test that the dynamic schema info was applied
    # with patch('requests.request') as mock_request:
    #     mock_response = MagicMock()
    #     mock_response.json.return_value = {"result": "success"}
    #     mock_request.return_value = mock_response

    #     list(tools[0].run())

    # mock_request.assert_called_once()
    # print(mock_request.call_args)
    # # call_args = mock_request.call_args[0]
    # assert 123 in call_args[1]  # URL should contain the session ID


if __name__ == "__main__":
    pytest.main([__file__])
