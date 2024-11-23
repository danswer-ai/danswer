import requests_mock

from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.test_models import DATestUser
from tests.integration.tests.custom_tools.test_custom_tool_utils import (
    build_and_run_tool,
)
from tests.integration.tests.custom_tools.test_custom_tool_utils import (
    create_and_verify_custom_tool,
)
from tests.integration.tests.custom_tools.test_custom_tool_utils import (
    process_tool_responses,
)

# Absolute imports for helper functions


def test_custom_image_tool(reset: None) -> None:
    # Create admin user directly in the test
    admin_user: DATestUser = UserManager.create(name="admin_user")

    # Define the tool using the provided OpenAPI schema for image fetching
    tool_definition = {
        "openapi": "3.0.0",
        "info": {
            "title": "Sample Image Fetch API",
            "version": "1.0.0",
            "description": "An API for fetching images",
        },
        "paths": {
            "/image/{image_id}": {
                "get": {
                    "summary": "Fetch an image",
                    "operationId": "fetchImage",
                    "responses": {
                        "200": {
                            "description": "Successful image fetch",
                            "content": {
                                "image/png": {
                                    "schema": {
                                        "type": "string",
                                        "format": "binary",
                                    }
                                },
                                "image/jpeg": {
                                    "schema": {
                                        "type": "string",
                                        "format": "binary",
                                    }
                                },
                            },
                        }
                    },
                    "parameters": [
                        {
                            "in": "path",
                            "name": "image_id",
                            "schema": {"type": "string"},
                            "required": True,
                            "description": "The ID of the image to fetch",
                        }
                    ],
                }
            }
        },
        "servers": [{"url": "http://localhost:8000"}],
    }

    # Create and verify the custom tool
    create_and_verify_custom_tool(
        tool_definition=tool_definition,
        user=admin_user,
        name="Sample Image Fetch Tool",
        description="A sample tool that fetches an image",
    )

    # Prepare mock image data for the API response
    mock_image_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01..."

    # Mock the requests made by the tool
    with requests_mock.Mocker() as m:
        m.get(
            "http://localhost:8000/image/123",
            content=mock_image_content,
            headers={"Content-Type": "image/png"},
        )

        # Prepare arguments for the tool
        tool_args = {"image_id": "123"}

        # Build and run the tool
        tool_responses = build_and_run_tool(tool_definition, tool_args)

        # Process the tool responses
        process_tool_responses(tool_responses)

    print("Custom image tool ran successfully with processed response")
