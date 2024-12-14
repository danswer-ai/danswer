import datetime

from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph

from danswer.agent_search.answer_query.graph_builder import answer_query_graph_builder
from danswer.agent_search.expanded_retrieval.graph_builder import (
    expanded_retrieval_graph_builder,
)
from danswer.agent_search.main.edges import parallelize_decompozed_answer_queries
from danswer.agent_search.main.nodes.base_decomp import main_decomp_base
from danswer.agent_search.main.nodes.dummy_node import dummy_node
from danswer.agent_search.main.nodes.generate_initial_answer import (
    generate_initial_answer,
)
from danswer.agent_search.main.states import MainInput
from danswer.agent_search.main.states import MainState


def main_graph_builder() -> StateGraph:
    graph = StateGraph(
        state_schema=MainState,
        input=MainInput,
    )

    ### Add nodes ###

    graph.add_node(
        node="dummy_node_start",
        action=dummy_node,
    )

    graph.add_node(
        node="dummy_node_right",
        action=dummy_node,
    )

    graph.add_node(
        node="base_decomp",
        action=main_decomp_base,
    )
    answer_query_subgraph = answer_query_graph_builder().compile()
    graph.add_node(
        node="answer_query",
        action=answer_query_subgraph,
    )
    expanded_retrieval_subgraph = expanded_retrieval_graph_builder().compile()
    graph.add_node(
        node="expanded_retrieval",
        action=expanded_retrieval_subgraph,
    )
    graph.add_node(
        node="generate_initial_answer",
        action=generate_initial_answer,
    )

    ### Add edges ###

    graph.add_edge(
        start_key=START,
        end_key="dummy_node_start",
    )

    graph.add_edge(
        start_key="dummy_node_start",
        end_key="dummy_node_right",
    )
    graph.add_edge(
        start_key="dummy_node_right",
        end_key="expanded_retrieval",
    )
    # graph.add_edge(
    #    start_key="expanded_retrieval",
    #    end_key="generate_initial_answer",
    # )

    graph.add_edge(
        start_key="dummy_node_start",
        end_key="base_decomp",
    )
    graph.add_conditional_edges(
        source="base_decomp",
        path=parallelize_decompozed_answer_queries,
        path_map=["answer_query"],
    )
    graph.add_edge(
        start_key=["answer_query", "expanded_retrieval"],
        end_key="generate_initial_answer",
    )
    graph.add_edge(
        start_key="generate_initial_answer",
        end_key=END,
    )

    return graph


if __name__ == "__main__":
    from danswer.db.engine import get_session_context_manager
    from danswer.llm.factory import get_default_llms
    from danswer.context.search.models import SearchRequest

    graph = main_graph_builder()
    compiled_graph = graph.compile()
    primary_llm, fast_llm = get_default_llms()
    search_request = SearchRequest(
        query="Who made Excel and what other products did they make?",
    )
    with get_session_context_manager() as db_session:
        inputs = MainInput(
            search_request=search_request,
            primary_llm=primary_llm,
            fast_llm=fast_llm,
            db_session=db_session,
        )

        print(f"START: {datetime.datetime.now()}")

        output = compiled_graph.invoke(
            input=inputs,
            # debug=True,
            # subgraphs=True,
        )
        print(output)
