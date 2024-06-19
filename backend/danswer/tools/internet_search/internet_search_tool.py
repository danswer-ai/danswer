from collections.abc import Generator
from datetime import datetime
import json
from typing import Any
from typing import cast
import uuid
import httpx

from pydantic import BaseModel
from danswer.chat.chat_utils import combine_message_chain 
from danswer.chat.models import LlmDoc
from danswer.configs.constants import DocumentSource
from danswer.configs.model_configs import GEN_AI_HISTORY_CUTOFF

from danswer.dynamic_configs.interface import JSON_ro
from danswer.llm.answering.models import PreviousMessage
from danswer.llm.interfaces import LLM
from danswer.llm.utils import message_to_string
from danswer.prompts.constants import GENERAL_SEP_PAT
from danswer.tools.search.search_tool import FINAL_CONTEXT_DOCUMENTS
from danswer.tools.tool import Tool
from danswer.tools.tool import ToolResponse
from danswer.utils.logger import setup_logger

logger = setup_logger()

INTERNET_SEARCH_RESPONSE_ID = "internet_search_response"

YES_INTERNET_SEARCH = "Yes Internet Search"
SKIP_INTERNET_SEARCH = "Skip Internet Search"

INTERNET_SEARCH_TEMPLATE = f"""
Given the conversation history and a follow up query, determine if the system should call \
an external internet search tool to better answer the latest user input.
Your default response is {SKIP_INTERNET_SEARCH}.

Respond "{YES_INTERNET_SEARCH}" if:
- The user is asking for information that requires an internet search.

Conversation History:
{GENERAL_SEP_PAT}
{{chat_history}}
{GENERAL_SEP_PAT}

If you are at all unsure, respond with {SKIP_INTERNET_SEARCH}.
Respond with EXACTLY and ONLY "{YES_INTERNET_SEARCH}" or "{SKIP_INTERNET_SEARCH}"

Follow Up Input:
{{final_query}}
""".strip()


class InternetSearchResult(BaseModel):
    title: str
    link: str
    snippet: str

class InternetSearchResponse(BaseModel):
    revised_query : str
    internet_results: list[InternetSearchResult]


internet_search_tool_description = """
Perform an internet search.
"""

def llm_doc_from_internet_search_result(result: InternetSearchResult) -> LlmDoc:
    return LlmDoc(
        document_id=result.link,
        content=result.snippet,
        blurb=result.snippet,
        semantic_identifier=result.link,
        source_type=DocumentSource.WEB,
        metadata={},
        updated_at=datetime.now(),
        link=result.link,
        source_links={0: result.link},
    )

class InternetSearchTool(Tool):
    NAME = "run_internet_search"

    def __init__(self, api_key: str, num_results: int = 10) -> None:
        self.api_key = api_key
        self.host = "https://api.bing.microsoft.com/v7.0"
        self.headers = {
            "Ocp-Apim-Subscription-Key": api_key,
            "Content-Type": "application/json",
        }
        self.num_results = num_results
        self.client = httpx.Client()

    def name(self) -> str:
        return self.NAME

    def tool_definition(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name(),
                "description": internet_search_tool_description,
                "parameters": {
                    "type": "object",
                    "properties": {
                        "internet_search_query": {
                            "type": "string",
                            "description": "Query to search on the internet",
                        },
                    },
                    "required": ["internet_search_query"],
                },
            },
        }

    def get_args_for_non_tool_calling_llm(
        self,
        query: str,
        history: list[PreviousMessage],
        llm: LLM,
        force_run: bool = False,
    ) -> dict[str, Any] | None:
        args = { "internet_search_query": query, }
        if force_run:
            return args
        
        history_str = combine_message_chain(
            messages=history,
            token_limit=GEN_AI_HISTORY_CUTOFF
        )
        prompt = INTERNET_SEARCH_TEMPLATE.format(
            chat_history=history_str,
            final_query=query,
        )
        use_internet_search_output = message_to_string(
            llm.invoke(prompt)
        )

        logger.debug(f"Evaluated if should use internet search: {use_internet_search_output}")

        if (
            YES_INTERNET_SEARCH.split()[0]
        ).lower() in use_internet_search_output.lower():
            return args
        return None

    def build_tool_message_content(
        self, *args: ToolResponse
    ) -> str | list[str | dict[str, Any]]:
        search_response = cast(
            InternetSearchResponse, args[0].response
        )
        return json.dumps(search_response.dict())

    def _perform_search(self, query: str) -> InternetSearchResponse:
        response = self.client.get(
            f"{self.host}/search",
            headers=self.headers,
            params={"q": query, "count": self.num_results},
        )
        results = response.json()

        return InternetSearchResponse(
            revised_query=query,
            internet_results=[
                InternetSearchResult(
                    title=result["name"],
                    link=result["url"],
                    snippet=result["snippet"],
                )
                for result in results["webPages"]["value"][:self.num_results]
            ]
        )

    def run(self, **kwargs: str) -> Generator[ToolResponse, None, None]:
        query = cast(str, kwargs["internet_search_query"])

        results = self._perform_search(query)
        yield ToolResponse(
            id=INTERNET_SEARCH_RESPONSE_ID,
            response=results,
        )

        llm_docs = [
            llm_doc_from_internet_search_result(result)
            for result in results.internet_results
        ]

        yield ToolResponse(
            id=FINAL_CONTEXT_DOCUMENTS,
            response=llm_docs,
        )

    def final_result(self, *args: ToolResponse) -> JSON_ro:
        search_response = cast(
            InternetSearchResponse, args[0].response
        )
        return search_response.dict()
