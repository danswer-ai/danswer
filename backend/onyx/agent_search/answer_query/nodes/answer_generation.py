from langchain_core.messages import HumanMessage
from langchain_core.messages import merge_message_runs

from onyx.agent_search.answer_query.states import AnswerQueryState
from onyx.agent_search.answer_query.states import QAGenerationOutput
from onyx.agent_search.shared_graph_utils.prompts import BASE_RAG_PROMPT
from onyx.agent_search.shared_graph_utils.utils import format_docs


def answer_generation(state: AnswerQueryState) -> QAGenerationOutput:
    query = state["query_to_answer"]
    docs = state["reranked_documents"]

    print(f"Number of verified retrieval docs: {len(docs)}")

    msg = [
        HumanMessage(
            content=BASE_RAG_PROMPT.format(question=query, context=format_docs(docs))
        )
    ]

    fast_llm = state["fast_llm"]
    response = list(
        fast_llm.stream(
            prompt=msg,
        )
    )

    answer_str = merge_message_runs(response, chunk_separator="")[0].content
    return QAGenerationOutput(
        answer=answer_str,
    )
