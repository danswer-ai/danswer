from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph

from danswer.agent_search.answer_query.nodes.qa_check import qa_check
from danswer.agent_search.answer_query.nodes.qa_generation import qa_generation
from danswer.agent_search.answer_query.states import AnswerQueryInput
from danswer.agent_search.answer_query.states import AnswerQueryState
from danswer.agent_search.expanded_retrieval.graph_builder import (
    expanded_retrieval_graph_builder,
)


def qa_graph_builder() -> StateGraph:
    graph = StateGraph(AnswerQueryState)

    expanded_retrieval_graph = expanded_retrieval_graph_builder()
    compiled_expanded_retrieval_graph = expanded_retrieval_graph.compile()
    graph.add_node(
        node="compiled_expanded_retrieval_graph",
        action=compiled_expanded_retrieval_graph,
    )
    graph.add_node(
        node="qa_check",
        action=qa_check,
    )
    graph.add_node(
        node="qa_generation",
        action=qa_generation,
    )

    graph.add_edge(
        start_key=START,
        end_key="compiled_expanded_retrieval_graph",
    )
    graph.add_edge(
        start_key="compiled_expanded_retrieval_graph",
        end_key="qa_generation",
    )
    graph.add_edge(
        start_key="qa_generation",
        end_key="qa_check",
    )
    graph.add_edge(
        start_key="qa_check",
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
        inputs = AnswerQueryInput(
            search_request=search_request,
            primary_llm=primary_llm,
            fast_llm=fast_llm,
            db_session=db_session,
            query_to_answer="Who made Excel?",
        )
        for thing in compiled_graph.stream(inputs, debug=True):
            print(thing)
