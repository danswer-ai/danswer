import operator
from collections.abc import Sequence
from datetime import datetime
from typing import Annotated
from typing import TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

from danswer.chat.models import DanswerContext
from danswer.llm.interfaces import LLM


class ResearchQAState(TypedDict):
    # The 'core SubQuestion'  state.
    original_question: str
    graph_start_time: datetime
    sub_question_rewritten_queries: list[str]
    sub_question: str
    sub_question_nr: int
    sub_question_base_retrieval_docs: Annotated[Sequence[DanswerContext], operator.add]
    sub_question_deduped_retrieval_docs: Annotated[
        Sequence[DanswerContext], operator.add
    ]
    sub_question_verified_retrieval_docs: Annotated[
        Sequence[DanswerContext], operator.add
    ]
    sub_question_reranked_retrieval_docs: Annotated[
        Sequence[DanswerContext], operator.add
    ]
    sub_question_top_chunks: Annotated[Sequence[dict], operator.add]
    sub_question_answer: str
    sub_question_answer_check: str
    log_messages: Annotated[Sequence[BaseMessage], add_messages]
    sub_qas: Annotated[Sequence[dict], operator.add]
    primary_llm: LLM
    fast_llm: LLM


class ResearchQAOutputState(TypedDict):
    # The 'SubQuestion'  output state. Removes all the intermediate states
    sub_question_rewritten_queries: list[str]
    sub_question: str
    sub_question_nr: int
    # Answers sent back to core
    sub_qas: Annotated[Sequence[dict], operator.add]
    sub_question_base_retrieval_docs: Annotated[Sequence[DanswerContext], operator.add]
    sub_question_deduped_retrieval_docs: Annotated[
        Sequence[DanswerContext], operator.add
    ]
    sub_question_verified_retrieval_docs: Annotated[
        Sequence[DanswerContext], operator.add
    ]
    sub_question_reranked_retrieval_docs: Annotated[
        Sequence[DanswerContext], operator.add
    ]
    sub_question_top_chunks: Annotated[Sequence[dict], operator.add]
    sub_question_answer: str
    sub_question_answer_check: str
    log_messages: Annotated[Sequence[BaseMessage], add_messages]
