import datetime
import json
from typing import Any
from typing import Dict
from typing import Literal

from langchain_core.messages import HumanMessage
from pydantic import BaseModel

from danswer.agent_search.primary_graph.states import QAState
from danswer.agent_search.primary_graph.states import RetrieverState
from danswer.agent_search.primary_graph.states import VerifierState
from danswer.agent_search.shared_graph_utils.prompts import BASE_CHECK_PROMPT
from danswer.agent_search.shared_graph_utils.prompts import BASE_RAG_PROMPT
from danswer.agent_search.shared_graph_utils.prompts import COMBINED_CONTEXT
from danswer.agent_search.shared_graph_utils.prompts import DECOMPOSE_PROMPT
from danswer.agent_search.shared_graph_utils.prompts import MODIFIED_RAG_PROMPT
from danswer.agent_search.shared_graph_utils.prompts import REWRITE_PROMPT_MULTI
from danswer.agent_search.shared_graph_utils.prompts import VERIFIER_PROMPT
from danswer.agent_search.shared_graph_utils.utils import format_docs
from danswer.agent_search.shared_graph_utils.utils import normalize_whitespace
from danswer.chat.models import DanswerContext
from danswer.llm.interfaces import LLM


# Pydantic models for structured outputs
class RewrittenQueries(BaseModel):
    rewritten_queries: list[str]


class BinaryDecision(BaseModel):
    decision: Literal["yes", "no"]


class SubQuestions(BaseModel):
    sub_questions: list[str]


# Transform the initial question into more suitable search queries.
def rewrite(qa_state: QAState) -> Dict[str, Any]:
    """
    Transform the initial question into more suitable search queries.

    Args:
        qa_state (messages): The current state

    Returns:
        dict: The updated state with re-phrased question
    """

    print("---TRANSFORM QUERY---")

    start_time = datetime.datetime.now()

    question = qa_state["original_question"]

    msg = [
        HumanMessage(
            content=REWRITE_PROMPT_MULTI.format(question=question),
        )
    ]

    # Get the rewritten queries in a defined format
    llm: LLM = qa_state["llm"]
    tools: list[dict] = qa_state["tools"]
    response = list(
        llm.stream(
            prompt=msg,
            tools=tools,
            structured_response_format=RewrittenQueries.model_json_schema(),
        )
    )

    formatted_response: RewrittenQueries = json.loads(response[0].content)

    end_time = datetime.datetime.now()
    return {
        "rewritten_queries": formatted_response.rewritten_queries,
        "log_messages": f"{str(start_time)} - {str(end_time)}: core - rewrite",
    }


def custom_retrieve(retriever_state: RetrieverState) -> Dict[str, Any]:
    """
    Retrieve documents

    Args:
        retriever_state (dict): The current graph state

    Returns:
        state (dict): New key added to state, documents, that contains retrieved documents
    """
    print("---RETRIEVE---")

    start_time = datetime.datetime.now()

    retriever_state["rewritten_query"]

    # Retrieval
    # TODO: add the actual retrieval, probably from search_tool.run()
    documents: list[DanswerContext] = []

    end_time = datetime.datetime.now()
    return {
        "base_retrieval_docs": documents,
        "log_messages": f"{str(start_time)} - {str(end_time)}: core - custom_retrieve",
    }


def combine_retrieved_docs(qa_state: QAState) -> Dict[str, Any]:
    """
    Dedupe the retrieved docs.
    """
    start_time = datetime.datetime.now()

    base_retrieval_docs = qa_state["base_retrieval_docs"]

    print(f"Number of docs from steps: {len(base_retrieval_docs)}")
    dedupe_docs = []
    for base_retrieval_doc in base_retrieval_docs:
        if base_retrieval_doc not in dedupe_docs:
            dedupe_docs.append(base_retrieval_doc)

    print(f"Number of deduped docs: {len(dedupe_docs)}")

    end_time = datetime.datetime.now()
    return {
        "deduped_retrieval_docs": dedupe_docs,
        "log_messages": f"{str(start_time)} - {str(end_time)}: core - combine_retrieved_docs (dedupe)",
    }


def verifier(state: VerifierState) -> Dict[str, Any]:
    """
    Check whether the document is relevant for the original user question

    Args:
        state (VerifierState): The current state

    Returns:
        dict: ict: The updated state with the final decision
    """

    print("---VERIFY QUTPUT---")
    start_time = datetime.datetime.now()

    question = state["original_question"]
    document_content = state["document"].content

    msg = [
        HumanMessage(
            content=VERIFIER_PROMPT.format(
                question=question, document_content=document_content
            )
        )
    ]

    # Grader
    llm: LLM = state["llm"]
    tools: list[dict] = state["tools"]
    response = list(
        llm.stream(
            prompt=msg,
            tools=tools,
            structured_response_format=BinaryDecision.model_json_schema(),
        )
    )

    formatted_response: BinaryDecision = response[0].content

    end_time = datetime.datetime.now()
    if formatted_response.decision == "yes":
        end_time = datetime.datetime.now()
        return {
            "deduped_retrieval_docs": [state["document"]],
            "log_messages": f"{str(start_time)} - {str(end_time)}: core - verifier: yes",
        }
    else:
        end_time = datetime.datetime.now()
        return {
            "deduped_retrieval_docs": [],
            "log_messages": f"{str(start_time)} - {str(end_time)}: core - verifier: no",
        }


def generate(qa_state: QAState) -> Dict[str, Any]:
    """
    Generate answer

    Args:
        qa_state (messages): The current state

    Returns:
         dict: The updated state with re-phrased question
    """
    print("---GENERATE---")
    start_time = datetime.datetime.now()

    question = qa_state["original_question"]
    docs = qa_state["deduped_retrieval_docs"]

    print(f"Number of verified retrieval docs: {docs}")

    # LLM
    llm: LLM = qa_state["llm"]

    # Chain
    # rag_chain = BASE_RAG_PROMPT | llm | StrOutputParser()

    msg = [
        HumanMessage(
            content=BASE_RAG_PROMPT.format(question=question, context=format_docs(docs))
        )
    ]

    # Grader
    llm: LLM = qa_state["llm"]
    tools: list[dict] = qa_state["tools"]
    response = list(
        llm.stream(
            prompt=msg,
            tools=tools,
            structured_response_format=None,
        )
    )

    # Run
    # response = rag_chain.invoke({"context": docs,
    #                             "question": question})

    end_time = datetime.datetime.now()
    return {
        "base_answer": response[0].content,
        "log_messages": f"{str(start_time)} - {str(end_time)}: core - generate",
    }


def base_check(qa_state: QAState) -> Dict[str, Any]:
    """
    Check whether the final output satisfies the original user question

    Args:
        qa_state (messages): The current state

    Returns:
        dict: ict: The updated state with the final decision
    """

    print("---CHECK QUTPUT---")
    start_time = datetime.datetime.now()

    # time.sleep(5)

    initial_base_answer = qa_state["initial_base_answer"]

    question = qa_state["original_question"]

    BASE_CHECK_MESSAGE = [
        HumanMessage(
            content=BASE_CHECK_PROMPT.format(
                question=question, base_answer=initial_base_answer
            )
        )
    ]

    llm: LLM = qa_state["llm"]
    tools: list[dict] = qa_state["tools"]
    response = list(
        llm.stream(
            prompt=BASE_CHECK_MESSAGE,
            tools=tools,
            structured_response_format=None,
        )
    )

    print(f"Verdict: {response[0].content}")

    end_time = datetime.datetime.now()
    return {
        "base_answer": initial_base_answer,
        "log_messages": f"{str(start_time)} - {str(end_time)}: core - base_check",
    }


def final_stuff(qa_state: QAState) -> Dict[str, Any]:
    """
    Invokes the agent model to generate a response based on the current state. Given
    the question, it will decide to retrieve using the retriever tool, or simply end.

    Args:
        qa_state (messages): The current state

    Returns:
        dict: The updated state with the agent response appended to messages
    """
    print("---FINAL---")
    start_time = datetime.datetime.now()

    messages = qa_state["log_messages"]
    time_ordered_messages = [x.content for x in messages]
    time_ordered_messages.sort()

    print("Message Log:")
    print("\n".join(time_ordered_messages))

    end_time = datetime.datetime.now()
    print(f"{str(start_time)} - {str(end_time)}: all  - final_stuff")

    print("--------------------------------")

    base_answer = qa_state["base_answer"]
    deep_answer = qa_state["deep_answer"]
    sub_qas = qa_state["checked_sub_qas"]
    sub_qa_list = []
    for sub_qa in sub_qas:
        sub_qa_list.append(
            f'  Question:\n  {sub_qa["sub_question"]}\n  --\n  Answer:\n  {sub_qa["sub_answer"]}\n  -----'
        )
    sub_qa_context = "\n".join(sub_qa_list)

    print(f"Final Base Answer:\n{base_answer}")
    print("--------------------------------")
    print(f"Final Deep Answer:\n{deep_answer}")
    print("--------------------------------")
    print("Sub Questions and Answers:")
    print(sub_qa_context)

    return {
        "log_messages": f"{str(start_time)} - {str(end_time)}: all - final_stuff",
    }


# nodes


def decompose(qa_state: QAState) -> Dict[str, Any]:
    """
    Decompose a complex question into simpler sub-questions.

    Args:
        qa_state: The current QA state containing the original question and LLM

    Returns:
        Dict containing sub_questions and log messages
    """

    start_time = datetime.datetime.now()

    question = qa_state["original_question"]

    msg = [
        HumanMessage(
            content=DECOMPOSE_PROMPT.format(question=question),
        )
    ]

    # Grader
    llm: LLM = qa_state["llm"]
    tools: list[dict] = qa_state["tools"]
    response = list(
        llm.stream(
            prompt=msg,
            tools=tools,
            structured_response_format=SubQuestions.model_json_schema(),
        )
    )

    formatted_response: SubQuestions = response[0].content

    end_time = datetime.datetime.now()
    return {
        "sub_questions": formatted_response.sub_questions,
        "log_messages": f"{str(start_time)} - {str(end_time)}: deep - decompose",
    }


# aggregate sub questions and answers
def consolidate_sub_qa(qa_state: QAState) -> Dict[str, Any]:
    """
    Consolidate sub-questions and their answers.

    Args:
        qa_state: The current QA state containing sub QAs

    Returns:
        Dict containing dynamic context, checked sub QAs and log messages
    """
    sub_qas = qa_state["sub_qas"]

    start_time = datetime.datetime.now()

    dynamic_context_list = [
        "Below you will find useful information to answer the original question:"
    ]
    checked_sub_qas = []

    for sub_qa in sub_qas:
        question = sub_qa["sub_question"]
        answer = sub_qa["sub_answer"]
        verified = sub_qa["sub_answer_check"]

        if verified == "yes":
            dynamic_context_list.append(
                f"Question:\n{question}\n\nAnswer:\n{answer}\n\n---\n\n"
            )
            checked_sub_qas.append({"sub_question": question, "sub_answer": answer})
    dynamic_context = "\n".join(dynamic_context_list)

    end_time = datetime.datetime.now()
    return {
        "dynamic_context": dynamic_context,
        "checked_sub_qas": checked_sub_qas,
        "log_messages": f"{str(start_time)} - {str(end_time)}: deep - consolidate_sub_qa",
    }


# aggregate sub questions and answers
def deep_answer_generation(qa_state: QAState) -> Dict[str, Any]:
    """
    Generate answer

    Args:
        qa_state (messages): The current state

    Returns:
         dict: The updated state with re-phrased question
    """
    print("---GENERATE---")
    start_time = datetime.datetime.now()

    question = qa_state["original_question"]
    docs = qa_state["deduped_retrieval_docs"]

    deep_answer_context = qa_state["dynamic_context"]

    print(f"Number of verified retrieval docs: {docs}")

    combined_context = normalize_whitespace(
        COMBINED_CONTEXT.format(
            deep_answer_context=deep_answer_context, formated_docs=format_docs(docs)
        )
    )

    msg = [
        HumanMessage(
            content=MODIFIED_RAG_PROMPT.format(
                question=question, combined_context=combined_context
            )
        )
    ]

    # Grader
    # LLM
    model: LLM = qa_state["llm"]
    response = model.invoke(msg)

    end_time = datetime.datetime.now()
    return {
        "final_deep_answer": response.content,
        "log_messages": f"{str(start_time)} - {str(end_time)}: deep - deep_answer_generation",
    }
    # return {"log_messages": [response]}
