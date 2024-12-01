import pytest
from requests.exceptions import HTTPError

from tests.integration.common_utils.managers.tool import ToolManager
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.test_models import DATestTool
from tests.integration.common_utils.test_models import DATestUser


def test_custom_search_tool(reset: None) -> None:
    # Creating an admin user (first user created is automatically an admin)
    admin_user: DATestUser = UserManager.create(name="admin_user")

    # Define the tool using the provided OpenAPI schema
    tool_definition = {
        "info": {
            "title": "Simple API",
            "version": "1.0.0",
            "description": "A minimal API for demonstration",
        },
        "paths": {
            "/hello": {
                "get": {
                    "summary": "Say hello",
                    "responses": {
                        "200": {
                            "description": "Successful response",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {"message": {"type": "string"}},
                                    }
                                }
                            },
                        }
                    },
                    "parameters": [
                        {
                            "in": "query",
                            "name": "name",
                            "schema": {"type": "string"},
                            "required": False,
                            "description": "Name to greet",
                        }
                    ],
                    "operationId": "sayHello",
                }
            }
        },
        "openapi": "3.0.0",
        "servers": [{"url": "http://localhost:8000"}],
    }

    # Create the custom tool with error handling
    try:
        print("Attempting to create custom tool...")
        custom_tool: DATestTool = ToolManager.create(
            name="Sample Search Tool",
            description="A sample tool that performs a search",
            definition=tool_definition,
            custom_headers=[],
            user_performing_action=admin_user,
        )
        print(f"Custom tool created successfully with ID: {custom_tool.id}")
    except HTTPError as e:
        pytest.fail(f"Failed to create custom tool: {e}")

    # Verify the tool was created successfully
    assert ToolManager.verify(custom_tool, user_performing_action=admin_user)
    print("Custom tool verified successfully")
