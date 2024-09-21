import unittest
from unittest.mock import patch

import pytest

from danswer.tools.custom.custom_tool import build_custom_tools_from_openapi_schema
from danswer.tools.custom.custom_tool import CUSTOM_TOOL_RESPONSE_ID
from danswer.tools.custom.custom_tool import CustomToolCallSummary
from danswer.tools.custom.custom_tool import validate_openapi_schema
from danswer.tools.models import DynamicSchemaInfo
from danswer.tools.tool import ToolResponse


class TestCustomTool(unittest.TestCase):
    """
    Test suite for CustomTool functionality.
    This class tests the creation, running, and result handling of custom tools
    based on OpenAPI schemas.
    """

    def setUp(self):
        """
        Set up the test environment before each test method.
        Initializes an OpenAPI schema and DynamicSchemaInfo for testing.
        """
        self.openapi_schema = {
            "openapi": "3.0.0",
            "info": {
                "version": "1.0.0",
                "title": "Assistants API",
                "description": "An API for managing assistants",
            },
            "servers": [
                {"url": "http://localhost:8080/CHAT_SESSION_ID/test/MESSAGE_ID"},
            ],
            "paths": {
                "/assistant/{assistant_id}": {
                    "GET": {
                        "summary": "Get a specific Assistant",
                        "operationId": "getAssistant",
                        "parameters": [
                            {
                                "name": "assistant_id",
                                "in": "path",
                                "required": True,
                                "schema": {"type": "string"},
                            }
                        ],
                    },
                    "POST": {
                        "summary": "Create a new Assistant",
                        "operationId": "createAssistant",
                        "parameters": [
                            {
                                "name": "assistant_id",
                                "in": "path",
                                "required": True,
                                "schema": {"type": "string"},
                            }
                        ],
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {"schema": {"type": "object"}}
                            },
                        },
                    },
                }
            },
        }
        validate_openapi_schema(self.openapi_schema)
        self.dynamic_schema_info = DynamicSchemaInfo(chat_session_id=10, message_id=20)

    @patch("danswer.tools.custom.custom_tool.requests.request")
    def test_custom_tool_run_get(self, mock_request):
        """
        Test the GET method of a custom tool.
        Verifies that the tool correctly constructs the URL and makes the GET request.
        """
        tools = build_custom_tools_from_openapi_schema(
            self.openapi_schema, dynamic_schema_info=self.dynamic_schema_info
        )

        result = list(tools[0].run(assistant_id="123"))
        expected_url = f"http://localhost:8080/{self.dynamic_schema_info.chat_session_id}/test/{self.dynamic_schema_info.message_id}/assistant/123"
        mock_request.assert_called_once_with("GET", expected_url, json=None)

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].id, CUSTOM_TOOL_RESPONSE_ID)
        self.assertEqual(result[0].response.tool_name, "getAssistant")

    @patch("danswer.tools.custom.custom_tool.requests.request")
    def test_custom_tool_run_post(self, mock_request):
        """
        Test the POST method of a custom tool.
        Verifies that the tool correctly constructs the URL and makes the POST request with the given body.
        """
        tools = build_custom_tools_from_openapi_schema(
            self.openapi_schema, dynamic_schema_info=self.dynamic_schema_info
        )

        result = list(tools[1].run(assistant_id="456"))
        expected_url = f"http://localhost:8080/{self.dynamic_schema_info.chat_session_id}/test/{self.dynamic_schema_info.message_id}/assistant/456"
        mock_request.assert_called_once_with("POST", expected_url, json=None)

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].id, CUSTOM_TOOL_RESPONSE_ID)
        self.assertEqual(result[0].response.tool_name, "createAssistant")

    def test_custom_tool_final_result(self):
        """
        Test the final_result method of a custom tool.
        Verifies that the method correctly extracts and returns the tool result.
        """
        tools = build_custom_tools_from_openapi_schema(
            self.openapi_schema, dynamic_schema_info=self.dynamic_schema_info
        )

        mock_response = ToolResponse(
            id=CUSTOM_TOOL_RESPONSE_ID,
            response=CustomToolCallSummary(
                tool_name="getAssistant",
                tool_result={"id": "789", "name": "Final Assistant"},
            ),
        )

        final_result = tools[0].final_result(mock_response)
        self.assertEqual(final_result, {"id": "789", "name": "Final Assistant"})


if __name__ == "__main__":
    pytest.main([__file__])
