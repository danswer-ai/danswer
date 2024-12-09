from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage
from langchain_core.messages import merge_message_runs

from danswer.agent_search.core_qa_graph.states import BaseQAState
from danswer.agent_search.shared_graph_utils.prompts import BASE_RAG_PROMPT
from danswer.agent_search.shared_graph_utils.utils import format_docs
from danswer.agent_search.shared_graph_utils.utils import generate_log_message
from danswer.llm.factory import get_default_llms


def sub_generate(state: BaseQAState) -> dict[str, Any]:
    """
    Generate answer

    Args:
        state (messages): The current state

    Returns:
         dict: The updated state with re-phrased question
    """
    print("---GENERATE---")
    
    # Create sub-query results

    verified_chunks = [chunk.center_chunk.chunk_id for chunk in state["sub_question_verified_retrieval_docs"]]
    result_dict = {}

    chunk_id_dicts = state["sub_chunk_ids"]
    expanded_chunks = []
    original_chunks = []
    
    for chunk_id_dict in chunk_id_dicts:
        sub_question = chunk_id_dict['query']
        verified_sq_chunks = [chunk_id for chunk_id in chunk_id_dict['chunk_ids'] if chunk_id in verified_chunks]

        if sub_question != state["original_question"]:
            expanded_chunks += verified_sq_chunks
        else:
            result_dict['ORIGINAL'] = len(verified_sq_chunks)
            original_chunks += verified_sq_chunks
        result_dict[sub_question[:30]] = len(verified_sq_chunks)
    
    expansion_chunks = set(expanded_chunks)
    num_expansion_chunks = sum([1 for chunk_id in expansion_chunks if chunk_id in verified_chunks])
    num_original_relevant_chunks = len(original_chunks)
    num_missed_relevant_chunks = sum([1 for chunk_id in original_chunks if chunk_id not in expansion_chunks])
    num_gained_relevant_chunks = sum([1 for chunk_id in expansion_chunks if chunk_id not in original_chunks])
    result_dict['expansion_chunks'] = num_expansion_chunks


        
    print(result_dict)

    node_start_time = datetime.now()

    question = state["sub_question_str"]
    docs = state["sub_question_verified_retrieval_docs"]

    print(f"Number of verified retrieval docs: {len(docs)}")
    
    # Only take the top 10 docs. 
    # TODO: Make this dynamic or use config param?
    top_10_docs = docs[-10:]

    msg = [
        HumanMessage(
            content=BASE_RAG_PROMPT.format(question=question, context=format_docs(top_10_docs))
        )
    ]

    # Grader
    _, fast_llm = get_default_llms()
    response = list(
        fast_llm.stream(
            prompt=msg,
            # structured_response_format=None,
        )
    )

    answer_str = merge_message_runs(response, chunk_separator="")[0].content
    return {
        "sub_question_answer": answer_str,
        "log_messages": generate_log_message(
            message="base - generate",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
