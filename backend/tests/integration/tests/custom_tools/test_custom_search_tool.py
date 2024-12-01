import datetime
from typing import cast

import requests_mock

from danswer.tools.models import ToolResponse
from danswer.tools.tool_implementations.custom.custom_tool import (
    CUSTOM_TOOL_RESPONSE_ID,
)
from danswer.tools.tool_implementations.custom.custom_tool import CustomToolCallSummary
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.test_models import DATestUser
from tests.integration.tests.custom_tools.test_custom_tool_utils import (
    build_and_run_tool,
)
from tests.integration.tests.custom_tools.test_custom_tool_utils import (
    create_and_verify_custom_tool,
)


def test_custom_search_tool(reset: None) -> None:
    admin_user: DATestUser = UserManager.create(name="admin_user")

    tool_definition = {
        "info": {
            "title": "Sample Search API",
            "version": "1.0.0",
            "description": "An API for performing searches and returning sample results",
        },
        "paths": {
            "/search": {
                "get": {
                    "summary": "Perform a search",
                    "responses": {
                        "200": {
                            "description": "Successful response",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "array",
                                        "items": {
                                            "$ref": "#/components/schemas/CustomToolSearchResult"
                                        },
                                    }
                                }
                            },
                        }
                    },
                    "parameters": [
                        {
                            "in": "query",
                            "name": "query",
                            "schema": {"type": "string"},
                            "required": True,
                            "description": "The search query",
                        }
                    ],
                    "operationId": "searchApi",
                }
            }
        },
        "openapi": "3.0.0",
        "servers": [{"url": "http://localhost:8000"}],
        "components": {
            "schemas": {
                "CustomToolSearchResult": {
                    "type": "object",
                    "required": [
                        "content",
                        "document_id",
                        "semantic_identifier",
                        "blurb",
                        "source_type",
                        "score",
                    ],
                    "properties": {
                        "content": {"type": "string"},
                        "document_id": {"type": "string"},
                        "semantic_identifier": {"type": "string"},
                        "blurb": {"type": "string"},
                        "source_type": {"type": "string"},
                        "score": {"type": "number", "format": "float"},
                        "link": {"type": "string", "nullable": True},
                        "title": {"type": "string", "nullable": True},
                        "updated_at": {
                            "type": "string",
                            "format": "date-time",
                            "nullable": True,
                        },
                    },
                }
            }
        },
    }

    create_and_verify_custom_tool(
        tool_definition=tool_definition,
        user=admin_user,
        name="Sample Search Tool",
        description="A sample tool that performs a search",
    )

    mock_results = [
        {
            "title": "Dog Article",
            "content": """Dogs are known for their loyalty and affection towards humans.
                They come in various breeds, each with unique characteristics.""",
            "document_id": "dog1",
            "semantic_identifier": "Dog Basics",
            "blurb": "An overview of dogs as pets and their general traits.",
            "source_type": "Pet Information",
            "score": 0.95,
            "link": "http://example.com/dogs/basics",
            "updated_at": datetime.datetime.now().isoformat(),
        },
        {
            "title": "Cat Article",
            "content": """Cats are independent and often aloof pets.
                They are known for their grooming habits and ability to hunt small prey.""",
            "document_id": "cat1",
            "semantic_identifier": "Cat Basics",
            "blurb": "An introduction to cats as pets and their typical behaviors.",
            "source_type": "Pet Information",
            "score": 0.92,
            "link": "http://example.com/cats/basics",
            "updated_at": datetime.datetime.now().isoformat(),
        },
        {
            "title": "Hamster Article",
            "content": """Hamsters are small rodents that make popular pocket pets.
                They are nocturnal and require a cage with exercise wheels and tunnels.""",
            "document_id": "hamster1",
            "semantic_identifier": "Hamster Care",
            "blurb": "Essential information for keeping hamsters as pets.",
            "source_type": "Pet Information",
            "score": 0.88,
            "link": "http://example.com/hamsters/care",
            "updated_at": datetime.datetime.now().isoformat(),
        },
    ]

    with requests_mock.Mocker() as m:
        m.get(
            "http://localhost:8000/search",
            json=mock_results,
        )

        tool_args = {"query": "pet information"}

        tool_responses = build_and_run_tool(tool_definition, tool_args)

        assert len(tool_responses) > 0
        for packet in tool_responses:
            if isinstance(packet, ToolResponse):
                if packet.id == CUSTOM_TOOL_RESPONSE_ID:
                    custom_tool_response = cast(CustomToolCallSummary, packet.response)
                    print(f"Custom tool response: {custom_tool_response.tool_result}")
                    assert isinstance(custom_tool_response.tool_result, list)
                    assert len(custom_tool_response.tool_result) == 3

                    expected_document_ids = ["dog1", "cat1", "hamster1"]
                    expected_titles = ["Dog Article", "Cat Article", "Hamster Article"]

                    for index, expected_id in enumerate(expected_document_ids):
                        result = custom_tool_response.tool_result[index]
                        assert result["document_id"] == expected_id
                        assert result["title"] == expected_titles[index]
                        assert "content" in result
                        assert "semantic_identifier" in result
                        assert "blurb" in result
                        assert "source_type" in result
                        assert "score" in result
                        assert "link" in result
                        assert "updated_at" in result
                else:
                    pass
            else:
                print(f"Received unexpected packet type: {type(packet)}")

    print("Custom search tool ran successfully with processed response")
