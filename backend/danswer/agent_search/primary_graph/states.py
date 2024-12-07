import operator
from collections.abc import Sequence
from datetime import datetime
from typing import Annotated
from typing import TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

from danswer.agent_search.shared_graph_utils.models import RewrittenQueries
from danswer.context.search.models import InferenceSection


class QAState(TypedDict):
    # The 'main' state of the answer graph
    original_question: str
    graph_start_time: datetime
    # start time for parallel initial sub-questionn thread
    sub_query_start_time: datetime
    log_messages: Annotated[Sequence[BaseMessage], add_messages]
    rewritten_queries: RewrittenQueries
    sub_questions: list[dict]
    initial_sub_questions: list[dict]
    ranked_subquestion_ids: list[int]
    decomposed_sub_questions_dict: dict
    rejected_sub_questions: Annotated[list[str], operator.add]
    rejected_sub_questions_handled: bool
    sub_qas: Annotated[Sequence[dict], operator.add]
    initial_sub_qas: Annotated[Sequence[dict], operator.add]
    checked_sub_qas: Annotated[Sequence[dict], operator.add]
    base_retrieval_docs: Annotated[Sequence[InferenceSection], operator.add]
    deduped_retrieval_docs: Annotated[Sequence[InferenceSection], operator.add]
    reranked_retrieval_docs: Annotated[Sequence[InferenceSection], operator.add]
    retrieved_entities_relationships: dict
    questions_context: list[dict]
    qa_level: int
    top_chunks: list[InferenceSection]
    sub_question_top_chunks: Annotated[Sequence[dict], operator.add]
    num_new_question_iterations: int
    core_answer_dynamic_context: str
    dynamic_context: str
    initial_base_answer: str
    base_answer: str
    deep_answer: str


class QAOuputState(TypedDict):
    # The 'main' output state of the answer graph. Removes all the intermediate states
    original_question: str
    log_messages: Annotated[Sequence[BaseMessage], add_messages]
    sub_questions: list[dict]
    sub_qas: Annotated[Sequence[dict], operator.add]
    initial_sub_qas: Annotated[Sequence[dict], operator.add]
    checked_sub_qas: Annotated[Sequence[dict], operator.add]
    reranked_retrieval_docs: Annotated[Sequence[InferenceSection], operator.add]
    retrieved_entities_relationships: dict
    top_chunks: list[InferenceSection]
    sub_question_top_chunks: Annotated[Sequence[dict], operator.add]
    base_answer: str
    deep_answer: str


class RetrieverState(TypedDict):
    # The state for the parallel Retrievers. They each need to see only one query
    rewritten_query: str
    graph_start_time: datetime


class VerifierState(TypedDict):
    # The state for the parallel verification step.  Each node execution need to see only one question/doc pair
    document: InferenceSection
    question: str
    graph_start_time: datetime
