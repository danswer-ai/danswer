import datetime
from typing import Any

from danswer.agent_search.primary_graph.states import RetrieverState
from danswer.agent_search.shared_graph_utils.utils import generate_log_message
from danswer.context.search.models import InferenceSection
from danswer.context.search.models import SearchRequest
from danswer.context.search.pipeline import SearchPipeline
from danswer.db.engine import get_session_context_manager
from danswer.llm.factory import get_default_llms


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

    rewritten_query = state["rewritten_query"]

    # Retrieval
    # TODO: add the actual retrieval, probably from search_tool.run()
    documents: list[InferenceSection] = []
    llm, fast_llm = get_default_llms()
    with get_session_context_manager() as db_session:
        documents = SearchPipeline(
            search_request=SearchRequest(
                query=rewritten_query,
            ),
            user=None,
            llm=llm,
            fast_llm=fast_llm,
            db_session=db_session,
        ).reranked_sections

    return {
        "sub_question_base_retrieval_docs": documents,
        "log_messages": generate_log_message(
            message="sub - custom_retrieve",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
