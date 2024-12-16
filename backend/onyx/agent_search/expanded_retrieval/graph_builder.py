from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph

from onyx.agent_search.expanded_retrieval.edges import parallel_retrieval_edge
from onyx.agent_search.expanded_retrieval.nodes.doc_reranking import doc_reranking
from onyx.agent_search.expanded_retrieval.nodes.doc_retrieval import doc_retrieval
from onyx.agent_search.expanded_retrieval.nodes.doc_verification import (
    doc_verification,
)
from onyx.agent_search.expanded_retrieval.nodes.verification_kickoff import (
    verification_kickoff,
)
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalInput
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalOutput
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalState


def expanded_retrieval_graph_builder() -> StateGraph:
    graph = StateGraph(
        state_schema=ExpandedRetrievalState,
        input=ExpandedRetrievalInput,
        output=ExpandedRetrievalOutput,
    )

    ### Add nodes ###

    graph.add_node(
        node="doc_retrieval",
        action=doc_retrieval,
    )
    graph.add_node(
        node="verification_kickoff",
        action=verification_kickoff,
    )
    graph.add_node(
        node="doc_verification",
        action=doc_verification,
    )
    graph.add_node(
        node="doc_reranking",
        action=doc_reranking,
    )

    ### Add edges ###

    graph.add_conditional_edges(
        source=START,
        path=parallel_retrieval_edge,
        path_map=["doc_retrieval"],
    )
    graph.add_edge(
        start_key="doc_retrieval",
        end_key="verification_kickoff",
    )
    graph.add_edge(
        start_key="doc_verification",
        end_key="doc_reranking",
    )
    graph.add_edge(
        start_key="doc_reranking",
        end_key=END,
    )

    return graph


if __name__ == "__main__":
    from onyx.db.engine import get_session_context_manager
    from onyx.llm.factory import get_default_llms
    from onyx.context.search.models import SearchRequest

    graph = expanded_retrieval_graph_builder()
    compiled_graph = graph.compile()
    primary_llm, fast_llm = get_default_llms()
    search_request = SearchRequest(
        query="Who made Excel and what other products did they make?",
    )
    with get_session_context_manager() as db_session:
        inputs = ExpandedRetrievalInput(
            search_request=search_request,
            primary_llm=primary_llm,
            fast_llm=fast_llm,
            db_session=db_session,
            query_to_answer="Who made Excel?",
        )
        for thing in compiled_graph.stream(inputs, debug=True):
            print(thing)
