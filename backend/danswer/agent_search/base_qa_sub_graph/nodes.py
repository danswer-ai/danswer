import datetime
import json
from typing import Any

from langchain_core.messages import HumanMessage

from danswer.agent_search.base_qa_sub_graph.states import BaseQAState
from danswer.agent_search.primary_graph.states import RetrieverState
from danswer.agent_search.primary_graph.states import VerifierState
from danswer.agent_search.shared_graph_utils.models import BinaryDecision
from danswer.agent_search.shared_graph_utils.models import RewrittenQueries
from danswer.agent_search.shared_graph_utils.prompts import BASE_CHECK_PROMPT
from danswer.agent_search.shared_graph_utils.prompts import BASE_RAG_PROMPT
from danswer.agent_search.shared_graph_utils.prompts import REWRITE_PROMPT_MULTI
from danswer.agent_search.shared_graph_utils.prompts import VERIFIER_PROMPT
from danswer.agent_search.shared_graph_utils.utils import format_docs
from danswer.agent_search.shared_graph_utils.utils import generate_log_message
from danswer.chat.models import DanswerContext
from danswer.llm.interfaces import LLM


# unused at this point. Kept from tutorial. But here the agent makes a routing decision
# not that much of an agent if the routing is static...
def sub_rewrite(state: BaseQAState) -> dict[str, Any]:
    """
    Transform the initial question into more suitable search queries.

    Args:
        state (messages): The current state

    Returns:
        dict: The updated state with re-phrased question
    """

    print("---SUB TRANSFORM QUERY---")

    node_start_time = datetime.datetime.now()

    # messages = state["base_answer_messages"]
    question = state["sub_question_str"]

    msg = [
        HumanMessage(
            content=REWRITE_PROMPT_MULTI.format(question=question),
        )
    ]
    fast_llm: LLM = state["fast_llm"]
    llm_response = list(
        fast_llm.stream(
            prompt=msg,
            structured_response_format=RewrittenQueries.model_json_schema(),
        )
    )

    # Get the rewritten queries in a defined format
    rewritten_queries: RewrittenQueries = json.loads(llm_response[0].pretty_repr())

    print(f"rewritten_queries: {rewritten_queries}")

    rewritten_queries = RewrittenQueries(
        rewritten_queries=[
            "music hard to listen to",
            "Music that is not fun or pleasant",
        ]
    )

    print(f"hardcoded rewritten_queries: {rewritten_queries}")

    return {
        "sub_question_rewritten_queries": rewritten_queries,
        "log_messages": generate_log_message(
            message="sub - rewrite",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


# dummy node to report on state if needed
def sub_custom_retrieve(state: RetrieverState) -> dict[str, Any]:
    """
    Retrieve documents

    Args:
        state (dict): The current graph state

    Returns:
        state (dict): New key added to state, documents, that contains retrieved documents
    """
    print("---RETRIEVE SUB---")

    node_start_time = datetime.datetime.now()

    # rewritten_query = state["rewritten_query"]

    # Retrieval
    # TODO: add the actual retrieval, probably from search_tool.run()
    documents: list[DanswerContext] = []

    return {
        "sub_question_base_retrieval_docs": documents,
        "log_messages": generate_log_message(
            message="sub - custom_retrieve",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


def sub_combine_retrieved_docs(state: BaseQAState) -> dict[str, Any]:
    """
    Dedupe the retrieved docs.
    """
    node_start_time = datetime.datetime.now()

    sub_question_base_retrieval_docs = state["sub_question_base_retrieval_docs"]

    print(f"Number of docs from steps: {len(sub_question_base_retrieval_docs)}")
    dedupe_docs = []
    for base_retrieval_doc in sub_question_base_retrieval_docs:
        if base_retrieval_doc not in dedupe_docs:
            dedupe_docs.append(base_retrieval_doc)

    print(f"Number of deduped docs: {len(dedupe_docs)}")

    return {
        "sub_question_deduped_retrieval_docs": dedupe_docs,
        "log_messages": generate_log_message(
            message="sub - combine_retrieved_docs (dedupe)",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


def sub_verifier(state: VerifierState) -> dict[str, Any]:
    """
    Check whether the document is relevant for the original user question

    Args:
        state (VerifierState): The current state

    Returns:
        dict: ict: The updated state with the final decision
    """

    print("---VERIFY QUTPUT---")
    node_start_time = datetime.datetime.now()

    question = state["question"]
    document_content = state["document"].content

    msg = [
        HumanMessage(
            content=VERIFIER_PROMPT.format(
                question=question, document_content=document_content
            )
        )
    ]

    # Grader
    llm: LLM = state["primary_llm"]
    response = list(
        llm.stream(
            prompt=msg,
            structured_response_format=BinaryDecision.model_json_schema(),
        )
    )

    raw_response = json.loads(response[0].pretty_repr())
    formatted_response = BinaryDecision.model_validate(raw_response)

    print(f"Verdict: {formatted_response.decision}")

    return {
        "sub_question_verified_retrieval_docs": [state["document"]]
        if formatted_response.decision == "yes"
        else [],
        "log_messages": generate_log_message(
            message=f"sub - verifier: {formatted_response.decision}",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


def sub_generate(state: BaseQAState) -> dict[str, Any]:
    """
    Generate answer

    Args:
        state (messages): The current state

    Returns:
         dict: The updated state with re-phrased question
    """
    print("---GENERATE---")
    start_time = datetime.datetime.now()

    question = state["original_question"]
    docs = state["sub_question_verified_retrieval_docs"]

    print(f"Number of verified retrieval docs: {len(docs)}")

    msg = [
        HumanMessage(
            content=BASE_RAG_PROMPT.format(question=question, context=format_docs(docs))
        )
    ]

    # Grader
    llm: LLM = state["primary_llm"]
    response = list(
        llm.stream(
            prompt=msg,
            structured_response_format=None,
        )
    )

    answer = response[0].pretty_repr()
    return {
        "sub_question_answer": answer,
        "log_messages": generate_log_message(
            message="base - generate",
            node_start_time=start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


def sub_final_format(state: BaseQAState) -> dict[str, Any]:
    """
    Create the final output for the QA subgraph
    """

    print("---BASE FINAL FORMAT---")
    datetime.datetime.now()

    return {
        "sub_qas": [
            {
                "sub_question": state["sub_question_str"],
                "sub_answer": state["sub_question_answer"],
                "sub_answer_check": state["sub_question_answer_check"],
            }
        ],
        "log_messages": state["log_messages"],
    }


def sub_qa_check(state: BaseQAState) -> dict[str, Any]:
    """
    Check if the sub-question answer is satisfactory.

    Args:
        state: The current SubQAState containing the sub-question and its answer

    Returns:
        dict containing the check result and log message
    """

    msg = [
        HumanMessage(
            content=BASE_CHECK_PROMPT.format(
                question=state["sub_question_str"],
                base_answer=state["sub_question_answer"],
            )
        )
    ]

    model: LLM = state["primary_llm"]
    response = list(
        model.stream(
            prompt=msg,
            structured_response_format=None,
        )
    )

    start_time = datetime.datetime.now()

    return {
        "sub_question_answer_check": response[0].pretty_repr().lower(),
        "base_answer_messages": generate_log_message(
            message="sub - qa_check",
            node_start_time=start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


def sub_dummy(state: BaseQAState) -> dict[str, Any]:
    """
    Dummy step
    """

    print("---Sub Dummy---")

    node_start_time = datetime.datetime.now()

    return {
        "log_messages": generate_log_message(
            message="sub - dummy",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
