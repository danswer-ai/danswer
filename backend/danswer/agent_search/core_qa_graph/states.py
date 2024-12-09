import operator
from collections.abc import Sequence
from datetime import datetime
from typing import Annotated
from typing import TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

from danswer.agent_search.shared_graph_utils.models import RewrittenQueries
from danswer.context.search.models import InferenceSection
from danswer.llm.interfaces import LLM


class SubQuestionRetrieverState(TypedDict):
    # The state for the parallel Retrievers. They each need to see only one query
    sub_question_rewritten_query: str


class SubQuestionVerifierState(TypedDict):
    # The state for the parallel verification step.  Each node execution need to see only one question/doc pair
    sub_question_document: InferenceSection
    sub_question: str


class CoreQAInputState(TypedDict):
    sub_question_str: str
    original_question: str


class BaseQAState(TypedDict):
    # The 'core SubQuestion'  state.
    original_question: str
    graph_start_time: datetime
    # start time for parallel initial sub-questionn thread
    sub_query_start_time: datetime
    sub_question_rewritten_queries: list[str]
    sub_question_str: str
    sub_question_search_queries: RewrittenQueries
    deduped_retrieval_docs: list[InferenceSection]
    sub_question_nr: int
    sub_question_base_retrieval_docs: Annotated[
        Sequence[InferenceSection], operator.add
    ]
    sub_question_deduped_retrieval_docs: Annotated[
        Sequence[InferenceSection], operator.add
    ]
    sub_question_verified_retrieval_docs: Annotated[
        Sequence[InferenceSection], operator.add
    ]
    sub_question_reranked_retrieval_docs: Annotated[
        Sequence[InferenceSection], operator.add
    ]
    sub_question_top_chunks: Annotated[Sequence[dict], operator.add]
    sub_question_answer: str
    sub_question_answer_check: str
    log_messages: Annotated[Sequence[BaseMessage], add_messages]
    sub_qas: Annotated[Sequence[dict], operator.add]
    # Answers sent back to core
    initial_sub_qas: Annotated[Sequence[dict], operator.add]
    primary_llm: LLM
    fast_llm: LLM


class BaseQAOutputState(TypedDict):
    # The 'SubQuestion'  output state. Removes all the intermediate states
    sub_question_rewritten_queries: list[str]
    sub_question_str: str
    sub_question_search_queries: list[str]
    sub_question_nr: int
    # Answers sent back to core
    sub_qas: Annotated[Sequence[dict], operator.add]
    # Answers sent back to core
    initial_sub_qas: Annotated[Sequence[dict], operator.add]
    sub_question_base_retrieval_docs: Annotated[
        Sequence[InferenceSection], operator.add
    ]
    sub_question_deduped_retrieval_docs: Annotated[
        Sequence[InferenceSection], operator.add
    ]
    sub_question_verified_retrieval_docs: Annotated[
        Sequence[InferenceSection], operator.add
    ]
    sub_question_reranked_retrieval_docs: Annotated[
        Sequence[InferenceSection], operator.add
    ]
    sub_question_top_chunks: Annotated[Sequence[dict], operator.add]
    sub_question_answer: str
    sub_question_answer_check: str
    log_messages: Annotated[Sequence[BaseMessage], add_messages]
