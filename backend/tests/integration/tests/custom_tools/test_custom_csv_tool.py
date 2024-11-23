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


def test_custom_csv_tool(reset: None) -> None:
    # Create admin user directly in the test
    admin_user: DATestUser = UserManager.create(name="admin_user")

    # Define the tool using the provided OpenAPI schema for CSV export
    tool_definition = {
        "openapi": "3.0.0",
        "info": {
            "title": "Sample CSV Export API",
            "version": "1.0.0",
            "description": "An API for exporting data in CSV format",
        },
        "paths": {
            "/export": {
                "get": {
                    "summary": "Export data in CSV format",
                    "operationId": "exportCsv",
                    "responses": {
                        "200": {
                            "description": "Successful CSV export",
                            "content": {
                                "text/csv": {
                                    "schema": {
                                        "type": "string",
                                        "format": "binary",
                                    }
                                }
                            },
                        }
                    },
                    "parameters": [
                        {
                            "in": "query",
                            "name": "date",
                            "schema": {"type": "string", "format": "date"},
                            "required": True,
                            "description": "The date for which to export data",
                        }
                    ],
                }
            }
        },
        "servers": [{"url": "http://localhost:8000"}],
    }

    create_and_verify_custom_tool(
        tool_definition=tool_definition,
        user=admin_user,
        name="Sample CSV Export Tool",
        description="A sample tool that exports data in CSV format",
    )

    mock_csv_content = "id,name,age\n1,Alice,30\n2,Bob,25\n3,Charlie,35\n"

    with requests_mock.Mocker() as m:
        m.get(
            "http://localhost:8000/export",
            text=mock_csv_content,
            headers={"Content-Type": "text/csv"},
        )

        # Prepare arguments for the tool
        tool_args = {"date": "2023-10-01"}

        # Build and run the tool
        tool_responses = build_and_run_tool(tool_definition, tool_args)

        # Process the tool responses
        process_tool_responses(tool_responses)

    print("Custom CSV tool ran successfully with processed response")
