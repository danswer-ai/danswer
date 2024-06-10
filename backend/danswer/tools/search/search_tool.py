import json
from collections.abc import Generator
from typing import Any
from typing import cast

from pydantic import BaseModel
from sqlalchemy.orm import Session

from danswer.chat.chat_utils import llm_doc_from_inference_section
from danswer.chat.models import LlmDoc
from danswer.db.models import Persona
from danswer.db.models import User
from danswer.llm.answering.doc_pruning import prune_documents
from danswer.llm.answering.models import DocumentPruningConfig
from danswer.llm.answering.models import PreviousMessage
from danswer.llm.answering.models import PromptConfig
from danswer.llm.factory import get_default_llm
from danswer.llm.interfaces import LLM
from danswer.llm.interfaces import LLMConfig
from danswer.search.enums import QueryFlow
from danswer.search.enums import SearchType
from danswer.search.models import BaseFilters
from danswer.search.models import IndexFilters
from danswer.search.models import InferenceSection
from danswer.search.models import RetrievalDetails
from danswer.search.models import SearchRequest
from danswer.search.models import Tag
from danswer.search.pipeline import SearchPipeline
from danswer.secondary_llm_flows.choose_search import check_if_need_search
from danswer.secondary_llm_flows.query_expansion import history_based_query_rephrase
from danswer.tools.search.search_utils import llm_doc_to_dict
from danswer.tools.tool import Tool
from danswer.tools.tool import ToolResponse
from danswer.utils.logger import setup_logger

SEARCH_RESPONSE_SUMMARY_ID = "search_response_summary"
SECTION_RELEVANCE_LIST_ID = "section_relevance_list"
FINAL_CONTEXT_DOCUMENTS = "final_context_documents"


class SearchResponseSummary(BaseModel):
    top_sections: list[InferenceSection]
    rephrased_query: str | None = None
    predicted_flow: QueryFlow | None
    predicted_search: SearchType | None
    final_filters: IndexFilters
    recency_bias_multiplier: float


search_tool_description = """
Runs a semantic search over the user's knowledge base. The default behavior is to use this tool. \
The only scenario where you should not use this tool is if:

- There is sufficient information in chat history to FULLY and ACCURATELY answer the query AND \
additional information or details would provide little or no value.
- The query is some form of request that does not require additional information to handle.

HINT: if you are unfamiliar with the user input OR think the user input is a typo, use this tool.
"""

HARDCODED_DTAGS_PROMPT = """
You will be given user query and list of all possible tags that sysyem can use to give user docs relevant for the query.
Think out loud in short and concise way what things might be relevant for the user query.
After finishing thinking out loud, make sure to provide the list of tags that you think are relevant for the user query.
The format should be a simple list of tags separated by commas in brackets, for example: `[tag1, tag2, tag3]`.
It should always be the last thing you write in the message. If not tags are relevant, write `[]`.
Here are all possible tag values: `{tag_values}` , here's the user query : `{query}`
"""


class SingleTagConfig(BaseModel):
    tag_key: str
    all_possible_tag_values: list[str]


class DtagsConfig(BaseModel):
    dtags: list[SingleTagConfig]


logger = setup_logger(__name__)


def generate_context_dependent_filters(
    query: str, dtags_config_str: str
) -> BaseFilters | None:
    """
    This function is used to generate filters based on the query and the persona's description.
    We use the dtags_config_str to parse it into expected format.
    Expected format:
    {
        "dtags": [
            {
            "tag_key": "Tags",
            "all_possible_tag_values": ["равенство", "дискриминация", "преступление"],
            },
            {
            "tag_key": "Select",
            "all_possible_tag_values": ["Уже во Франции", "Хочу во Францию"],
            },
            ],
    }
    Args:
    query: str: The query that the user has asked.
    dtags_config_str: str: The persona's description that contains the dtags_config and can be loaded into a dict with json.loads.

    Returns:
    BaseFilters: The filters that are generated based on the query and the dtags_config_str.
    """

    # define pydantic model and validators using our doc
    # copilot, write it and define validators
    try:
        dtags_config = DtagsConfig(**json.loads(dtags_config_str))
    except Exception as e:
        logger.error(
            f"Error parsing dtags config. Will use empty filters, error is: {e}"
        )
        filters = None
        # filters = BaseFilters(
        #     tags=[Tag(tag_key="Tags", tag_value="равенство")]
        # )  # эксперимент
    all_tags = []
    llm = get_default_llm()
    for dtag_config in dtags_config.dtags:
        try:
            tag_values = str(dtag_config.all_possible_tag_values)
            choose_tags_prompt = HARDCODED_DTAGS_PROMPT.format(
                tag_values=tag_values, query=query
            )
            chosen_tags_msg = llm.invoke(
                prompt=choose_tags_prompt, tools=None, tool_choice=None
            )
            logger.info(f"Chosen tags msg: {chosen_tags_msg.content}")
            raw_tags = str(chosen_tags_msg).split("[")[-1].split("]")[0].split(",")
            tags = [
                Tag(tag_key=dtag_config.tag_key, tag_value=tag.strip())
                for tag in raw_tags
            ]
            all_tags.extend(tags)
        except (ValueError, TypeError) as e:
            logger.error(
                f"Error parsing dtags config. Will skip this tag, error is: {e}"
            )
    filters = BaseFilters(tags=all_tags)
    return filters


class SearchTool(Tool):
    def __init__(
        self,
        db_session: Session,
        user: User | None,
        persona: Persona,
        retrieval_options: RetrievalDetails | None,
        prompt_config: PromptConfig,
        llm_config: LLMConfig,
        pruning_config: DocumentPruningConfig,
        # if specified, will not actually run a search and will instead return these
        # sections. Used when the user selects specific docs to talk to
        selected_docs: list[LlmDoc] | None = None,
        chunks_above: int = 0,
        chunks_below: int = 0,
        full_doc: bool = False,
    ) -> None:
        self.user = user
        self.persona = persona
        self.retrieval_options = retrieval_options
        self.prompt_config = prompt_config
        self.llm_config = llm_config
        self.pruning_config = pruning_config

        self.selected_docs = selected_docs

        self.chunks_above = chunks_above
        self.chunks_below = chunks_below
        self.full_doc = full_doc
        self.db_session = db_session

    @classmethod
    def name(cls) -> str:
        return "run_search"

    """For explicit tool calling"""

    @classmethod
    def tool_definition(cls) -> dict:
        return {
            "type": "function",
            "function": {
                "name": cls.name(),
                "description": search_tool_description,
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "What to search for",
                        },
                    },
                    "required": ["query"],
                },
            },
        }

    def build_tool_message_content(
        self, *args: ToolResponse
    ) -> str | list[str | dict[str, Any]]:
        final_context_docs_response = args[2]
        final_context_docs = cast(list[LlmDoc], final_context_docs_response.response)

        return json.dumps(
            {
                "search_results": [
                    llm_doc_to_dict(doc, ind)
                    for ind, doc in enumerate(final_context_docs)
                ]
            }
        )

    """For LLMs that don't support tool calling"""

    def get_args_for_non_tool_calling_llm(
        self,
        query: str,
        history: list[PreviousMessage],
        llm: LLM,
        force_run: bool = False,
    ) -> dict[str, Any] | None:
        if not force_run and not check_if_need_search(
            query=query, history=history, llm=llm
        ):
            return None

        rephrased_query = history_based_query_rephrase(
            query=query, history=history, llm=llm
        )
        return {"query": rephrased_query}

    """Actual tool execution"""

    def _build_response_for_specified_sections(
        self, query: str
    ) -> Generator[ToolResponse, None, None]:
        if self.selected_docs is None:
            raise ValueError("sections must be specified")

        yield ToolResponse(
            id=SEARCH_RESPONSE_SUMMARY_ID,
            response=SearchResponseSummary(
                rephrased_query=None,
                top_sections=[],
                predicted_flow=None,
                predicted_search=None,
                final_filters=IndexFilters(access_control_list=None),  # dummy filters
                recency_bias_multiplier=1.0,
            ),
        )
        yield ToolResponse(
            id=SECTION_RELEVANCE_LIST_ID,
            response=[i for i in range(len(self.selected_docs))],
        )
        yield ToolResponse(
            id=FINAL_CONTEXT_DOCUMENTS,
            response=prune_documents(
                docs=self.selected_docs,
                doc_relevance_list=None,
                prompt_config=self.prompt_config,
                llm_config=self.llm_config,
                question=query,
                document_pruning_config=self.pruning_config,
            ),
        )

    def run(self, **kwargs: str) -> Generator[ToolResponse, None, None]:
        query = cast(str, kwargs["query"])

        if self.selected_docs:
            yield from self._build_response_for_specified_sections(query)
            return
        if "[DTAGS]" in self.persona.description:
            dtags_config_str = self.persona.description.split("[DTAGS]")[-1].split(
                "[/DTAGS]"
            )[0]
            filters = generate_context_dependent_filters(query, dtags_config_str)
            if not self.retrieval_options:
                self.retrieval_options = RetrievalDetails(filters=filters)
            else:
                self.retrieval_options.filters = filters
        search_pipeline = SearchPipeline(
            search_request=SearchRequest(
                query=query,
                human_selected_filters=(
                    self.retrieval_options.filters if self.retrieval_options else None
                ),
                persona=self.persona,
                offset=(
                    self.retrieval_options.offset if self.retrieval_options else None
                ),
                limit=self.retrieval_options.limit if self.retrieval_options else None,
                chunks_above=self.chunks_above,
                chunks_below=self.chunks_below,
                full_doc=self.full_doc,
            ),
            user=self.user,
            db_session=self.db_session,
        )
        yield ToolResponse(
            id=SEARCH_RESPONSE_SUMMARY_ID,
            response=SearchResponseSummary(
                rephrased_query=query,
                top_sections=search_pipeline.reranked_sections,
                predicted_flow=search_pipeline.predicted_flow,
                predicted_search=search_pipeline.predicted_search_type,
                final_filters=search_pipeline.search_query.filters,
                recency_bias_multiplier=search_pipeline.search_query.recency_bias_multiplier,
            ),
        )
        yield ToolResponse(
            id=SECTION_RELEVANCE_LIST_ID,
            response=search_pipeline.relevant_chunk_indices,
        )

        llm_docs = [
            llm_doc_from_inference_section(section)
            for section in search_pipeline.reranked_sections
        ]
        final_context_documents = prune_documents(
            docs=llm_docs,
            doc_relevance_list=[
                True if ind in search_pipeline.relevant_chunk_indices else False
                for ind in range(len(llm_docs))
            ],
            prompt_config=self.prompt_config,
            llm_config=self.llm_config,
            question=query,
            document_pruning_config=self.pruning_config,
        )
        yield ToolResponse(id=FINAL_CONTEXT_DOCUMENTS, response=final_context_documents)
