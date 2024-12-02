import datetime
import json
from typing import Any
from typing import Dict
from typing import Literal

from langchain_core.messages import HumanMessage
from pydantic import BaseModel

from danswer.agent_search.primary_graph.states import RetrieverState
from danswer.agent_search.primary_graph.states import VerifierState
from danswer.agent_search.shared_graph_utils.prompts import BASE_CHECK_PROMPT
from danswer.agent_search.shared_graph_utils.prompts import BASE_RAG_PROMPT
from danswer.agent_search.shared_graph_utils.prompts import REWRITE_PROMPT_MULTI
from danswer.agent_search.shared_graph_utils.prompts import VERIFIER_PROMPT
from danswer.agent_search.shared_graph_utils.utils import format_docs
from danswer.agent_search.subgraph.states import SubQAOutputState
from danswer.agent_search.subgraph.states import SubQAState
from danswer.chat.models import DanswerContext
from danswer.llm.interfaces import LLM


class BinaryDecision(BaseModel):
    decision: Literal["yes", "no"]


# unused at this point. Kept from tutorial. But here the agent makes a routing decision
# not that much of an agent if the routing is static...
def sub_rewrite(sub_qa_state: SubQAState) -> Dict[str, Any]:
    """
    Transform the initial question into more suitable search queries.

    Args:
        state (messages): The current state

    Returns:
        dict: The updated state with re-phrased question
    """

    print("---SUB TRANSFORM QUERY---")

    start_time = datetime.datetime.now()

    # messages = state["base_answer_messages"]
    question = sub_qa_state["sub_question"]

    msg = [
        HumanMessage(
            content=REWRITE_PROMPT_MULTI.format(question=question),
        )
    ]
    print(msg)

    # Get the rewritten queries in a defined format
    ##response = model.with_structured_output(RewrittenQuery).invoke(msg)
    ##rewritten_query = response.base_answer_rewritten_query

    rewritten_queries = ["music hard to listen to", "Music that is not fun or pleasant"]

    end_time = datetime.datetime.now()
    return {
        "sub_question_rewritten_queries": rewritten_queries,
        "log_messages": f"{str(start_time)} - {str(end_time)}: sub - rewrite",
    }


# dummy node to report on state if needed
def sub_custom_retrieve(retriever_state: RetrieverState) -> Dict[str, Any]:
    """
    Retrieve documents

    Args:
        state (dict): The current graph state

    Returns:
        state (dict): New key added to state, documents, that contains retrieved documents
    """
    print("---RETRIEVE SUB---")

    start_time = datetime.datetime.now()

    retriever_state["rewritten_query"]

    # query = state["rewritten_query"]

    # Retrieval
    # TODO: add the actual retrieval, probably from search_tool.run()
    documents: list[DanswerContext] = []

    end_time = datetime.datetime.now()
    return {
        "sub_question_base_retrieval_docs": documents,
        "log_messages": f"{str(start_time)} - {str(end_time)}: sub - custom_retrieve",
    }


def sub_combine_retrieved_docs(sub_qa_state: SubQAState) -> Dict[str, Any]:
    """
    Dedupe the retrieved docs.
    """
    start_time = datetime.datetime.now()

    sub_question_base_retrieval_docs = sub_qa_state["sub_question_base_retrieval_docs"]

    print(f"Number of docs from steps: {len(sub_question_base_retrieval_docs)}")
    dedupe_docs = []
    for base_retrieval_doc in sub_question_base_retrieval_docs:
        if base_retrieval_doc not in dedupe_docs:
            dedupe_docs.append(base_retrieval_doc)

    print(f"Number of deduped docs: {len(dedupe_docs)}")

    end_time = datetime.datetime.now()
    return {
        "sub_question_deduped_retrieval_docs": dedupe_docs,
        "log_messages": f"{str(start_time)} - {str(end_time)}: base - combine_retrieved_docs (dedupe)",
    }


def verifier(verifier_state: VerifierState) -> Dict[str, Any]:
    """
    Check whether the document is relevant for the original user question

    Args:
        state (VerifierState): The current state

    Returns:
        dict: ict: The updated state with the final decision
    """

    print("---VERIFY QUTPUT---")
    start_time = datetime.datetime.now()

    question = verifier_state["original_question"]
    document_content = verifier_state["document"].content

    msg = [
        HumanMessage(
            content=VERIFIER_PROMPT.format(
                question=question, document_content=document_content
            )
        )
    ]

    # Grader
    llm: LLM = verifier_state["llm"]
    tools: list[dict] = verifier_state["tools"]
    response = list(
        llm.stream(
            prompt=msg,
            tools=tools,
            structured_response_format=BinaryDecision.model_json_schema(),
        )
    )

    formatted_response: BinaryDecision = json.loads(response[0].content)
    verdict = formatted_response.decision

    print(f"Verdict: {verdict}")

    end_time = datetime.datetime.now()
    if verdict == "yes":
        end_time = datetime.datetime.now()
        return {
            "sub_question_verified_retrieval_docs": [verifier_state["document"]],
            "log_messages": f"{str(start_time)} - {str(end_time)}: base - verifier: yes",
        }
    else:
        end_time = datetime.datetime.now()
        return {
            "sub_question_verified_retrieval_docs": [],
            "log_messages": f"{str(start_time)} - {str(end_time)}: base - verifier: no",
        }


def sub_generate(sub_qa_state: SubQAState) -> Dict[str, Any]:
    """
    Generate answer

    Args:
        state (messages): The current state

    Returns:
         dict: The updated state with re-phrased question
    """
    print("---GENERATE---")
    start_time = datetime.datetime.now()

    question = sub_qa_state["sub_question"]
    docs = sub_qa_state["sub_question_verified_retrieval_docs"]

    print(f"Number of verified retrieval docs: {docs}")

    # LLM
    llm: LLM = sub_qa_state["llm"]

    msg = [
        HumanMessage(
            content=BASE_RAG_PROMPT.format(question=question, context=format_docs(docs))
        )
    ]

    # Grader
    llm: LLM = sub_qa_state["llm"]
    tools: list[dict] = sub_qa_state["tools"]
    response = list(
        llm.stream(
            prompt=msg,
            tools=tools,
            structured_response_format=None,
        )
    )

    answer = response[0].content

    end_time = datetime.datetime.now()
    return {
        "sub_question_answer": answer,
        "log_messages": f"{str(start_time)} - {str(end_time)}: base - generate",
    }


def sub_base_check(sub_qa_state: SubQAState) -> Dict[str, Any]:
    """
    Check whether the final output satisfies the original user question

    Args:
        state (messages): The current state

    Returns:
        dict: ict: The updated state with the final decision
    """

    print("---CHECK QUTPUT---")
    start_time = datetime.datetime.now()

    base_answer = sub_qa_state["core_answer_base_answer"]

    question = sub_qa_state["original_question"]

    BASE_CHECK_MESSAGE = [
        HumanMessage(
            content=BASE_CHECK_PROMPT.format(question=question, base_answer=base_answer)
        )
    ]

    llm: LLM = sub_qa_state["llm"]
    tools: list[dict] = sub_qa_state["tools"]
    response = list(
        llm.stream(
            prompt=BASE_CHECK_MESSAGE,
            tools=tools,
            structured_response_format=BinaryDecision.model_json_schema(),
        )
    )

    formatted_response: BinaryDecision = json.loads(response[0].content)
    verdict = formatted_response.decision

    print(f"Verdict: {verdict}")

    end_time = datetime.datetime.now()
    return {
        "base_answer": base_answer,
        "log_messages": f"{str(start_time)} - {str(end_time)}: core - base_check",
    }


def sub_final_format(sub_qa_state: SubQAState) -> SubQAOutputState:
    """
    Create the final output for the QA subgraph
    """

    print("---BASE FINAL FORMAT---")
    datetime.datetime.now()

    return {
        "sub_qas": [
            {
                "sub_question": sub_qa_state["sub_question"],
                "sub_answer": sub_qa_state["sub_question_answer"],
                "sub_answer_check": sub_qa_state["sub_question_answer_check"],
            }
        ],
        "log_messages": sub_qa_state["log_messages"],
    }


def sub_qa_check(sub_qa_state: SubQAState) -> Dict[str, str]:
    """
    Check if the sub-question answer is satisfactory.

    Args:
        state: The current SubQAState containing the sub-question and its answer

    Returns:
        Dict containing the check result and log message
    """
    end_time = datetime.datetime.now()

    q = sub_qa_state["sub_question"]
    a = sub_qa_state["sub_question_answer"]

    BASE_CHECK_MESSAGE = [
        HumanMessage(content=BASE_CHECK_PROMPT.format(question=q, base_answer=a))
    ]

    model: LLM = sub_qa_state["llm"]
    response = model.invoke(BASE_CHECK_MESSAGE)

    start_time = datetime.datetime.now()

    return {
        "sub_question_answer_check": response.content.lower(),
        "base_answer_messages": f"{str(start_time)} - {str(end_time)}: base - qa_check",
    }
