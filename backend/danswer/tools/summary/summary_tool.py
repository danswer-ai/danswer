import json
from collections.abc import Generator
from typing import Any
from typing import cast
from collections.abc import Callable

from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel

from danswer.chat.chat_utils import combine_message_chain
from danswer.configs.model_configs import GEN_AI_HISTORY_CUTOFF
from danswer.dynamic_configs.interface import JSON_ro
from danswer.file_store.models import InMemoryChatFile
from danswer.llm.answering.prompts.build import AnswerPromptBuilder, default_build_system_message, \
    default_build_user_message
from danswer.llm.utils import message_to_string, _build_content, get_max_input_tokens, get_default_llm_tokenizer
from danswer.prompts.constants import GENERAL_SEP_PAT
from danswer.tools.summary.split_by_sentence_tokens import split_section_by_tokens
from danswer.tools.tool import Tool
from danswer.tools.tool import ToolResponse
from danswer.utils.logger import setup_logger
from danswer.db.models import Persona
from danswer.db.models import User
from danswer.llm.answering.models import PromptConfig, PreviousMessage
from danswer.llm.interfaces import LLMConfig, LLM

logger = setup_logger()

SUMMARY_GENERATION_RESPONSE_ID = "summary_generation_response"

Summary_tool_description = """
Runs query on LLM to get Summary. 
HINT: if input question as about Summary generation use this tool.
"""
YES_Summary_GENERATION = "YES"
SKIP_Summary_GENERATION = "NO"

Summary_GENERATION_TEMPLATE = f"""
Given the conversation history and a follow up query, determine if the system should call \
an external Summary generation tool to better answer the latest user input. If user query is related to database, or it query related response should be {YES_Summary_GENERATION}.
Your default response is {SKIP_Summary_GENERATION}.

Respond "{YES_Summary_GENERATION}" if:
- The user is asking for an Summary to be generated.

Conversation History:
{GENERAL_SEP_PAT}
{{chat_history}}
{GENERAL_SEP_PAT}

If you are at all unsure, respond with {SKIP_Summary_GENERATION}.
Respond with EXACTLY and ONLY "{SKIP_Summary_GENERATION}" or "{YES_Summary_GENERATION}"

Follow Up Input:
{{final_query}}
""".strip()

SUMMARY_GENERATION_PROMPT = """your are Summary knowledge expert, your responsible to generate valid Summary script based on user input. 
do not add any explanation, do not makeup any answer. don't use your knowledge. based on provided meta data generate Summary query.

always generate Summary query using only following tables, don't use tables which is not in below list. Don't generate any additional details or explanation except Summary.

tables and columns to use:
Album(AlbumId  primary key, Title, ArtistId)
Artist(ArtistId primary key,Name)
Customer(CustomerId primary key,FirstName,LastName,Company,Address,City,State,Country)
Employee(EmployeeId primary key,FirstName,LastName,Title,ReportsTo, BirthDate,Address,City,State,Country,Phone,Email)



QUERY: <USER_QUERY>
RESPONSE:"""


class SummaryGenerationResponse(BaseModel):
    Summary: str | None = None


class SummaryGenerationTool(Tool):
    _NAME = "run_summary_generation"
    _DESCRIPTION = Summary_tool_description
    _DISPLAY_NAME = "Summary Generation Tool"

    def __init__(
            self,
            user: User | None,
            persona: Persona,
            prompt_config: PromptConfig,
            llm_config: LLMConfig,
            llm: LLM | None,
            files: list[InMemoryChatFile] | None
    ) -> None:
        self.user = user
        self.persona = persona
        self.prompt_config = prompt_config
        self.llm_config = llm_config
        self.llm =llm
        self.files=files

    @property
    def name(self) -> str:
        return self._NAME

    @property
    def description(self) -> str:
        return self._DESCRIPTION

    @property
    def display_name(self) -> str:
        return self._DISPLAY_NAME

    """For explicit tool calling"""

    def tool_definition(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": {
                        "prompt": {
                            "type": "string",
                            "description": "Prompt used to generate the Summary statement",
                        },
                    },
                    "required": ["prompt"],
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
        args = {"query": query}
        return args

    def build_tool_message_content(
            self, *args: ToolResponse
    ) -> str | list[str | dict[str, Any]]:
        generation_response = args[0]
        summary_text_generations = cast(
            list[SummaryGenerationResponse], generation_response.response
        )
        return json.dumps(
            {
                "search_results": [
                    {
                        Summary_generation.Summary
                    }
                    for Summary_generation in summary_text_generations
                ]
            }
        )

    def run(self, **kwargs: str) -> Generator[ToolResponse, None, None]:
        query = cast(str, kwargs["query"])
        llm_config = self.llm_config
        max_tokens = get_max_input_tokens(
            model_name=self.llm.config.model_name,
            model_provider=self.llm.config.model_provider,
        )
        llm_tokenizer = get_default_llm_tokenizer()
        encode_fn = cast(
            Callable[[str], list[int]], llm_tokenizer.encode
        )

        decode_fn = cast(
            Callable[[list], [str]], llm_tokenizer.decode
        )
        history = []
        prompt_builder = AnswerPromptBuilder(history, llm_config)

        prompt_builder.update_system_prompt(
            default_build_system_message(self.prompt_config)
        )
        summaries = []
        message_content = _build_content(query, self.files)

        #sections = self.split_text_by_paragraphs(message_content)
        #sections = message_content.split('\n\n')
        sections = split_section_by_tokens(message_content, max_tokens, buffer_percent=0.3, encode_fn=encode_fn, decode_fn = decode_fn)

        for section in sections:
            prompt_builder.update_user_prompt(
                default_build_user_message(
                    user_query=section, prompt_config=self.prompt_config, files=[]
                )
            )
            prompt = prompt_builder.build()

            summaries.append( message_to_string(
                self.llm.invoke(prompt=prompt)
            ))

        yield ToolResponse(
            id=SUMMARY_GENERATION_RESPONSE_ID,
            response = " ".join(summaries)
        )

    def split_text_by_paragraphs(self, text):
        """Split text into chunks of paragraphs with a buffer for previous summaries."""

        chunks = []
        current_chunk = []

        max_tokens = get_max_input_tokens(
            model_name=self.llm.config.model_name,
            model_provider=self.llm.config.model_provider,
        )
        if len(text.split()) < max_tokens:
            return [text]

        #calculate effective max tokens
        buffer_percent=0.4
        buffer_tokens = int(max_tokens * buffer_percent)
        effective_max_tokens = max_tokens - buffer_tokens

        recursive = False
        if recursive:
            text_splitter = RecursiveCharacterTextSplitter( separators=[
                    "\n\n",
                    "\n",
                    " ",
                    ".",
                    ",",
                    "\u200b",  # Zero-width space
                    "\uff0c",  # Fullwidth comma
                    "\u3001",  # Ideographic comma
                    "\uff0e",  # Fullwidth full stop
                    "\u3002",  # Ideographic full stop
                    "",
                ],
                    chunk_size = effective_max_tokens,
                    chunk_overlap  = 100,
                    length_function = len,
                )

            chunks = text_splitter.split_text(text)
            return chunks
        else:
            paragraphs = text.split('\n')
            current_length = 0
            for paragraph in paragraphs:
                paragraph_length = len(paragraph.split())
                if current_length + paragraph_length > effective_max_tokens:
                    if current_chunk:
                        chunks.append("\n".join(current_chunk))
                    current_chunk = []
                    current_length = 0
                current_chunk.append(paragraph)
                current_length += paragraph_length


            if current_chunk:
                chunks.append("\n\n".join(current_chunk))


            return chunks

    def final_result(self, *args: ToolResponse) -> JSON_ro:
        summary_generation_response = cast(
            list[ToolResponse], args[0].response
        )
        # NOTE: need to do this json.loads(doc.json()) stuff because there are some
        # subfields that are not serializable by default (datetime)
        # this forces pydantic to make them JSON serializable for us
        return summary_generation_response
