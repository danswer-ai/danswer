import json
from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage

from danswer.agent_search.base_qa_sub_graph.states import BaseQAState
from danswer.agent_search.primary_graph.states import RetrieverState
from danswer.agent_search.primary_graph.states import VerifierState
from danswer.agent_search.research_qa_sub_graph.states import ResearchQAState
from danswer.agent_search.shared_graph_utils.models import BinaryDecision
from danswer.agent_search.shared_graph_utils.models import RewrittenQueries
from danswer.agent_search.shared_graph_utils.prompts import BASE_RAG_PROMPT
from danswer.agent_search.shared_graph_utils.prompts import REWRITE_PROMPT_MULTI
from danswer.agent_search.shared_graph_utils.prompts import SUB_CHECK_PROMPT
from danswer.agent_search.shared_graph_utils.prompts import VERIFIER_PROMPT
from danswer.agent_search.shared_graph_utils.utils import format_docs
from danswer.agent_search.shared_graph_utils.utils import generate_log_message
from danswer.chat.models import DanswerContext
from danswer.llm.interfaces import LLM


def sub_rewrite(state: ResearchQAState) -> dict[str, Any]:
    """
    Transform the initial question into more suitable search queries.

    Args:
        state (messages): The current state

    Returns:
        dict: The updated state with re-phrased question
    """

    print("---SUB TRANSFORM QUERY---")
    node_start_time = datetime.now()

    question = state["sub_question"]

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


def sub_custom_retrieve(state: RetrieverState) -> dict[str, Any]:
    """
    Retrieve documents

    Args:
        state (dict): The current graph state

    Returns:
        state (dict): New key added to state, documents, that contains retrieved documents
    """
    print("---RETRIEVE SUB---")
    node_start_time = datetime.now()

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


def sub_combine_retrieved_docs(state: ResearchQAState) -> dict[str, Any]:
    """
    Dedupe the retrieved docs.
    """
    node_start_time = datetime.now()

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

    print("---SUB VERIFY QUTPUT---")
    node_start_time = datetime.now()

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
    model = state["fast_llm"]
    response = model.invoke(msg)

    if response.pretty_repr().lower() == "yes":
        return {
            "sub_question_verified_retrieval_docs": [state["document"]],
            "log_messages": generate_log_message(
                message="sub - verifier: yes",
                node_start_time=node_start_time,
                graph_start_time=state["graph_start_time"],
            ),
        }
    else:
        return {
            "sub_question_verified_retrieval_docs": [],
            "log_messages": generate_log_message(
                message="sub - verifier: no",
                node_start_time=node_start_time,
                graph_start_time=state["graph_start_time"],
            ),
        }


def sub_generate(state: ResearchQAState) -> dict[str, Any]:
    """
    Generate answer

    Args:
        state (messages): The current state

    Returns:
         dict: The updated state with re-phrased question
    """
    print("---SUB GENERATE---")
    node_start_time = datetime.now()

    question = state["sub_question"]
    docs = state["sub_question_verified_retrieval_docs"]

    print(f"Number of verified retrieval docs for sub-question: {len(docs)}")

    msg = [
        HumanMessage(
            content=BASE_RAG_PROMPT.format(question=question, context=format_docs(docs))
        )
    ]

    # Grader
    if len(docs) > 0:
        model = state["fast_llm"]
        response = model.invoke(msg).pretty_repr()
    else:
        response = ""

    return {
        "sub_question_answer": response,
        "log_messages": generate_log_message(
            message="sub - generate",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


def sub_final_format(state: ResearchQAState) -> dict[str, Any]:
    """
    Create the final output for the QA subgraph
    """

    print("---SUB  FINAL FORMAT---")
    node_start_time = datetime.now()

    return {
        # TODO: Type this
        "sub_qas": [
            {
                "sub_question": state["sub_question"],
                "sub_answer": state["sub_question_answer"],
                "sub_question_nr": state["sub_question_nr"],
                "sub_answer_check": state["sub_question_answer_check"],
            }
        ],
        "log_messages": generate_log_message(
            message="sub - final format",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


# nodes


def sub_qa_check(state: ResearchQAState) -> dict[str, Any]:
    """
    Check whether the final output satisfies the original user question

    Args:
        state (messages): The current state

    Returns:
        dict: The updated state with the final decision
    """

    print("---CHECK SUB QUTPUT---")
    node_start_time = datetime.now()

    sub_answer = state["sub_question_answer"]
    sub_question = state["sub_question"]

    msg = [
        HumanMessage(
            content=SUB_CHECK_PROMPT.format(
                sub_question=sub_question, sub_answer=sub_answer
            )
        )
    ]

    # Grader
    model = state["fast_llm"]
    response = list(
        model.stream(
            prompt=msg,
            structured_response_format=BinaryDecision.model_json_schema(),
        )
    )

    raw_response = json.loads(response[0].pretty_repr())
    formatted_response = BinaryDecision.model_validate(raw_response)

    return {
        "sub_question_answer_check": formatted_response.decision,
        "log_messages": generate_log_message(
            message=f"sub - qa check: {formatted_response.decision}",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


def sub_dummy(state: BaseQAState) -> dict[str, Any]:
    """
    Dummy step
    """

    print("---Sub Dummy---")

    return {
        "log_messages": generate_log_message(
            message="sub - dummy",
            node_start_time=datetime.now(),
            graph_start_time=state["graph_start_time"],
        ),
    }
