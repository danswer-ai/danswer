import json
import re
from collections.abc import Sequence
from datetime import datetime
from typing import Any
from typing import Dict
from typing import Literal

from langchain_core.messages import HumanMessage
from pydantic import BaseModel

from danswer.agent_search.primary_graph.states import QAState
from danswer.agent_search.primary_graph.states import RetrieverState
from danswer.agent_search.primary_graph.states import VerifierState
from danswer.agent_search.shared_graph_utils.prompts import BASE_RAG_PROMPT
from danswer.agent_search.shared_graph_utils.prompts import ENTITY_TERM_PROMPT
from danswer.agent_search.shared_graph_utils.prompts import INITIAL_DECOMPOSITION_PROMPT
from danswer.agent_search.shared_graph_utils.prompts import INITIAL_RAG_PROMPT
from danswer.agent_search.shared_graph_utils.prompts import REWRITE_PROMPT_MULTI
from danswer.agent_search.shared_graph_utils.prompts import VERIFIER_PROMPT
from danswer.agent_search.shared_graph_utils.utils import clean_and_parse_list_string
from danswer.agent_search.shared_graph_utils.utils import format_docs
from danswer.agent_search.shared_graph_utils.utils import generate_log_message
from danswer.chat.models import DanswerContext
from danswer.llm.interfaces import LLM

# Maybe try Partial[QAState]
# from typing import Partial


# Pydantic models for structured outputs
class RewrittenQueries(BaseModel):
    rewritten_queries: list[str]


class BinaryDecision(BaseModel):
    decision: Literal["yes", "no"]


class SubQuestions(BaseModel):
    sub_questions: list[str]


# Transform the initial question into more suitable search queries.
def rewrite(state: QAState) -> Dict[str, Any]:
    """
    Transform the initial question into more suitable search queries.

    Args:
        qa_state (messages): The current state

    Returns:
        dict: The updated state with re-phrased question
    """
    print("---STARTING GRAPH---")
    graph_start_time = datetime.now()

    print("---TRANSFORM QUERY---")
    node_start_time = datetime.now()

    question = state["original_question"]

    msg = [
        HumanMessage(
            content=REWRITE_PROMPT_MULTI.format(question=question),
        )
    ]

    # Get the rewritten queries in a defined format
    fast_llm: LLM = state["fast_llm"]
    llm_response = list(
        fast_llm.stream(
            prompt=msg,
            structured_response_format=RewrittenQueries.model_json_schema(),
        )
    )

    formatted_response: RewrittenQueries = json.loads(llm_response[0].content)

    return {
        "rewritten_queries": formatted_response.rewritten_queries,
        "log_messages": generate_log_message(
            message="core - rewrite",
            node_start_time=node_start_time,
            graph_start_time=graph_start_time,
        ),
    }


def custom_retrieve(state: RetrieverState) -> Dict[str, Any]:
    """
    Retrieve documents

    Args:
        retriever_state (dict): The current graph state

    Returns:
        state (dict): New key added to state, documents, that contains retrieved documents
    """
    print("---RETRIEVE---")

    node_start_time = datetime.now()

    # query = state["rewritten_query"]

    # Retrieval
    # TODO: add the actual retrieval, probably from search_tool.run()
    documents: list[DanswerContext] = []

    return {
        "base_retrieval_docs": documents,
        "log_messages": generate_log_message(
            message="core - custom_retrieve",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


def combine_retrieved_docs(state: QAState) -> Dict[str, Any]:
    """
    Dedupe the retrieved docs.
    """
    node_start_time = datetime.now()

    base_retrieval_docs: Sequence[DanswerContext] = state["base_retrieval_docs"]

    print(f"Number of docs from steps: {len(base_retrieval_docs)}")
    dedupe_docs: list[DanswerContext] = []
    for base_retrieval_doc in base_retrieval_docs:
        if not any(
            base_retrieval_doc.document_id == doc.document_id for doc in dedupe_docs
        ):
            dedupe_docs.append(base_retrieval_doc)

    print(f"Number of deduped docs: {len(dedupe_docs)}")

    return {
        "deduped_retrieval_docs": dedupe_docs,
        "log_messages": generate_log_message(
            message="core - combine_retrieved_docs (dedupe)",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
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
    node_start_time = datetime.now()

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
    llm: LLM = state["fast_llm"]
    response = list(
        llm.stream(
            prompt=msg,
            structured_response_format=BinaryDecision.model_json_schema(),
        )
    )

    formatted_response: BinaryDecision = response[0].content

    return {
        "deduped_retrieval_docs": [state["document"]]
        if formatted_response.decision == "yes"
        else [],
        "log_messages": generate_log_message(
            message=f"core - verifier: {formatted_response.decision}",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


def generate(state: QAState) -> Dict[str, Any]:
    """
    Generate answer

    Args:
        state (messages): The current state

    Returns:
         dict: The updated state with re-phrased question
    """
    print("---GENERATE---")
    node_start_time = datetime.now()

    question = state["original_question"]
    docs = state["deduped_retrieval_docs"]

    print(f"Number of verified retrieval docs: {len(docs)}")

    msg = [
        HumanMessage(
            content=BASE_RAG_PROMPT.format(question=question, context=format_docs(docs))
        )
    ]

    # Grader
    llm: LLM = state["fast_llm"]
    response = list(
        llm.stream(
            prompt=msg,
            structured_response_format=None,
        )
    )

    # Run
    # response = rag_chain.invoke({"context": docs,
    #                             "question": question})

    return {
        "base_answer": response[0].content,
        "log_messages": generate_log_message(
            message="core - generate",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


def final_stuff(state: QAState) -> Dict[str, Any]:
    """
    Invokes the agent model to generate a response based on the current state. Given
    the question, it will decide to retrieve using the retriever tool, or simply end.

    Args:
        state (messages): The current state

    Returns:
        dict: The updated state with the agent response appended to messages
    """
    print("---FINAL---")
    node_start_time = datetime.now()

    messages = state["log_messages"]
    time_ordered_messages = [x.content for x in messages]
    time_ordered_messages.sort()

    print("Message Log:")
    print("\n".join(time_ordered_messages))

    initial_sub_qas = state["initial_sub_qas"]
    initial_sub_qa_list = []
    for initial_sub_qa in initial_sub_qas:
        if initial_sub_qa["sub_answer_check"] == "yes":
            initial_sub_qa_list.append(
                f'  Question:\n  {initial_sub_qa["sub_question"]}\n  --\n  Answer:\n  {initial_sub_qa["sub_answer"]}\n  -----'
            )

    initial_sub_qa_context = "\n".join(initial_sub_qa_list)

    log_message = generate_log_message(
        message="all - final_stuff",
        node_start_time=node_start_time,
        graph_start_time=state["graph_start_time"],
    )

    print(log_message)
    print("--------------------------------")

    base_answer = state["base_answer"]

    print(f"Final Base Answer:\n{base_answer}")
    print("--------------------------------")
    print(f"Initial Answered Sub Questions:\n{initial_sub_qa_context}")
    print("--------------------------------")

    if not state.get("deep_answer"):
        print("No Deep Answer was required")
        return {
            "log_messages": log_message,
        }

    deep_answer = state["deep_answer"]
    sub_qas = state["sub_qas"]
    sub_qa_list = []
    for sub_qa in sub_qas:
        if sub_qa["sub_answer_check"] == "yes":
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
        "log_messages": generate_log_message(
            message="all - final_stuff",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


def base_wait(state: QAState) -> Dict[str, Any]:
    """
    Ensures that all required steps are completed before proceeding to the next step

    Args:
        state (messages): The current state

    Returns:
        dict: {} (no operation, just logging)
    """

    print("---Base Wait ---")
    node_start_time = datetime.now()
    return {
        "log_messages": generate_log_message(
            message="core - base_wait",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


def entity_term_extraction(state: QAState) -> Dict[str, Any]:
    """ """

    node_start_time = datetime.now()

    question = state["original_question"]
    docs = state["deduped_retrieval_docs"]

    doc_context = format_docs(docs)

    msg = [
        HumanMessage(
            content=ENTITY_TERM_PROMPT.format(question=question, context=doc_context),
        )
    ]

    # Grader
    model = state["fast_llm"]
    response = model.invoke(msg)

    cleaned_response = re.sub(r"```json\n|\n```", "", response.content)
    parsed_response = json.loads(cleaned_response)

    return {
        "retrieved_entities_relationships": parsed_response,
        "log_messages": generate_log_message(
            message="deep - entity term extraction",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


def generate_initial(state: QAState) -> Dict[str, Any]:
    """
    Generate answer

    Args:
        state (messages): The current state

    Returns:
         dict: The updated state with re-phrased question
    """
    print("---GENERATE INITIAL---")
    node_start_time = datetime.now()

    question = state["original_question"]
    docs = state["deduped_retrieval_docs"]
    print(f"Number of verified retrieval docs - base: {len(docs)}")

    sub_question_answers = state["initial_sub_qas"]

    sub_question_answers_list = []

    _SUB_QUESTION_ANSWER_TEMPLATE = """
    Sub-Question:\n  - {sub_question}\n  --\nAnswer:\n  - {sub_answer}\n\n
    """
    for sub_question_answer_dict in sub_question_answers:
        if (
            sub_question_answer_dict["sub_answer_check"] == "yes"
            and len(sub_question_answer_dict["sub_answer"]) > 0
            and sub_question_answer_dict["sub_answer"] != "I don't know"
        ):
            sub_question_answers_list.append(
                _SUB_QUESTION_ANSWER_TEMPLATE.format(
                    sub_question=sub_question_answer_dict["sub_question"],
                    sub_answer=sub_question_answer_dict["sub_answer"],
                )
            )

    sub_question_answer_str = "\n\n------\n\n".join(sub_question_answers_list)

    msg = [
        HumanMessage(
            content=INITIAL_RAG_PROMPT.format(
                question=question,
                context=format_docs(docs),
                answered_sub_questions=sub_question_answer_str,
            )
        )
    ]

    # Grader
    model = state["fast_llm"]
    response = model.invoke(msg)

    # Run
    # response = rag_chain.invoke({"context": docs,
    #                             "question": question})

    return {
        "base_answer": response.content,
        "log_messages": generate_log_message(
            message="core - generate initial",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }


def main_decomp_base(state: QAState) -> Dict[str, Any]:
    """
    Perform an initial question decomposition, incl. one search term

    Args:
        state (messages): The current state

    Returns:
        dict: The updated state with initial decomposition
    """

    print("---INITIAL DECOMP---")
    node_start_time = datetime.now()

    question = state["original_question"]

    msg = [
        HumanMessage(
            content=INITIAL_DECOMPOSITION_PROMPT.format(question=question),
        )
    ]
    """
    msg = [
        HumanMessage(
            content=INITIAL_DECOMPOSITION_PROMPT_BASIC.format(question=question),
        )
    ]
    """

    # Get the rewritten queries in a defined format
    model = state["fast_llm"]
    response = model.invoke(msg)

    content = response.content
    list_of_subquestions = clean_and_parse_list_string(content)
    # response = model.invoke(msg)

    decomp_list = []

    for sub_question_nr, sub_question in enumerate(list_of_subquestions):
        sub_question_str = sub_question["sub_question"].strip()
        # temporarily
        sub_question_search_queries = [sub_question["search_term"]]

        decomp_list.append(
            {
                "sub_question_str": sub_question_str,
                "sub_question_search_queries": sub_question_search_queries,
                "sub_question_nr": sub_question_nr,
            }
        )

    return {
        "initial_sub_questions": decomp_list,
        "start_time_temp": node_start_time,
        "log_messages": generate_log_message(
            message="core - initial decomp",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
