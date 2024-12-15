from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph

from danswer.agent_search.answer_query.nodes.answer_check import answer_check
from danswer.agent_search.answer_query.nodes.answer_generation import answer_generation
from danswer.agent_search.answer_query.nodes.format_answer import format_answer
from danswer.agent_search.answer_query.states import AnswerQueryInput
from danswer.agent_search.answer_query.states import AnswerQueryOutput
from danswer.agent_search.answer_query.states import AnswerQueryState
from danswer.agent_search.expanded_retrieval.graph_builder import (
    expanded_retrieval_graph_builder,
)


def answer_query_graph_builder() -> StateGraph:
    graph = StateGraph(
        state_schema=AnswerQueryState,
        input=AnswerQueryInput,
        output=AnswerQueryOutput,
    )

    ### Add nodes ###

    expanded_retrieval = expanded_retrieval_graph_builder().compile()
    graph.add_node(
        node="expanded_retrieval_for_initial_decomp",
        action=expanded_retrieval,
    )
    graph.add_node(
        node="answer_check",
        action=answer_check,
    )
    graph.add_node(
        node="answer_generation",
        action=answer_generation,
    )
    graph.add_node(
        node="format_answer",
        action=format_answer,
    )

    ### Add edges ###

    graph.add_edge(
        start_key=START,
        end_key="expanded_retrieval_for_initial_decomp",
    )
    graph.add_edge(
        start_key="expanded_retrieval_for_initial_decomp",
        end_key="answer_generation",
    )
    graph.add_edge(
        start_key="answer_generation",
        end_key="answer_check",
    )
    graph.add_edge(
        start_key="answer_check",
        end_key="format_answer",
    )
    graph.add_edge(
        start_key="format_answer",
        end_key=END,
    )

    return graph


if __name__ == "__main__":
    from danswer.db.engine import get_session_context_manager
    from danswer.llm.factory import get_default_llms
    from danswer.context.search.models import SearchRequest

    graph = answer_query_graph_builder()
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
        output = compiled_graph.invoke(
            input=inputs,
            # debug=True,
            # subgraphs=True,
        )
        print(output)
        # for namespace, chunk in compiled_graph.stream(
        #     input=inputs,
        #     # debug=True,
        #     subgraphs=True,
        # ):
        #     print(namespace)
        #     print(chunk)
