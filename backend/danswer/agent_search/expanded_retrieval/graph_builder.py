from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph

from danswer.agent_search.expanded_retrieval.edges import conditionally_rerank_edge
from danswer.agent_search.expanded_retrieval.edges import parallel_retrieval_edge
from danswer.agent_search.expanded_retrieval.nodes.collect_retrieved_docs import (
    kick_off_verification,
)
from danswer.agent_search.expanded_retrieval.nodes.doc_reranking import doc_reranking
from danswer.agent_search.expanded_retrieval.nodes.doc_retrieval import doc_retrieval
from danswer.agent_search.expanded_retrieval.nodes.doc_verification import (
    doc_verification,
)
from danswer.agent_search.expanded_retrieval.states import ExpandedRetrievalInput
from danswer.agent_search.expanded_retrieval.states import ExpandedRetrievalState


def qa_graph_builder() -> StateGraph:
    graph = StateGraph(ExpandedRetrievalState)

    graph.add_node(
        node="doc_retrieval",
        action=doc_retrieval,
    )
    graph.add_node(
        node="kick_off_verification",
        action=kick_off_verification,
    )
    graph.add_node(
        node="doc_verification",
        action=doc_verification,
    )
    graph.add_node(
        node="doc_reranking",
        action=doc_reranking,
    )

    graph.add_conditional_edges(
        source=START,
        path=parallel_retrieval_edge,
    )
    graph.add_edge(
        start_key="doc_retrieval",
        end_key="kick_off_verification",
    )
    graph.add_conditional_edges(
        source="doc_verification",
        path=conditionally_rerank_edge,
        path_map={
            True: "doc_reranking",
            False: END,
        },
    )
    graph.add_edge(
        start_key="doc_reranking",
        end_key=END,
    )

    return graph


if __name__ == "__main__":
    from danswer.db.engine import get_session_context_manager
    from danswer.llm.factory import get_default_llms
    from danswer.context.search.models import SearchRequest

    graph = qa_graph_builder()
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
            query_to_expand="Who made Excel?",
        )
        for thing in compiled_graph.stream(inputs, debug=True):
            print(thing)
        # output = compiled_graph.invoke(inputs)
        # print("\nOUTPUT:")
        # print(output.keys())
        # for key, value in output.items():
        #     if key in [
        #         "sub_question_answer",
        #         "sub_question_str",
        #         "sub_qas",
        #         "initial_sub_qas",
        #         "sub_question_answer",
        #     ]:
        #         print(f"{key}: {value}")
