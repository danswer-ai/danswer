from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph

from onyx.agent_search.answer_question.edges import send_to_expanded_retrieval
from onyx.agent_search.answer_question.nodes.answer_check import answer_check
from onyx.agent_search.answer_question.nodes.answer_generation import answer_generation
from onyx.agent_search.answer_question.nodes.format_answer import format_answer
from onyx.agent_search.answer_question.nodes.ingest_retrieval import ingest_retrieval
from onyx.agent_search.answer_question.states import AnswerQuestionInput
from onyx.agent_search.answer_question.states import AnswerQuestionOutput
from onyx.agent_search.answer_question.states import AnswerQuestionState
from onyx.agent_search.expanded_retrieval.graph_builder import (
    expanded_retrieval_graph_builder,
)


def answer_query_graph_builder() -> StateGraph:
    graph = StateGraph(
        state_schema=AnswerQuestionState,
        input=AnswerQuestionInput,
        output=AnswerQuestionOutput,
    )

    ### Add nodes ###

    expanded_retrieval = expanded_retrieval_graph_builder().compile()
    graph.add_node(
        node="decomped_expanded_retrieval",
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
    graph.add_node(
        node="ingest_retrieval",
        action=ingest_retrieval,
    )

    ### Add edges ###

    graph.add_conditional_edges(
        source=START,
        path=send_to_expanded_retrieval,
        path_map=["decomped_expanded_retrieval"],
    )
    graph.add_edge(
        start_key="decomped_expanded_retrieval",
        end_key="ingest_retrieval",
    )
    graph.add_edge(
        start_key="ingest_retrieval",
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
    from onyx.db.engine import get_session_context_manager
    from onyx.llm.factory import get_default_llms
    from onyx.context.search.models import SearchRequest

    graph = answer_query_graph_builder()
    compiled_graph = graph.compile()
    primary_llm, fast_llm = get_default_llms()
    search_request = SearchRequest(
        query="what can you do with onyx or danswer?",
    )
    with get_session_context_manager() as db_session:
        inputs = AnswerQuestionInput(
            search_request=search_request,
            primary_llm=primary_llm,
            fast_llm=fast_llm,
            db_session=db_session,
            question="what can you do with onyx?",
        )
        for thing in compiled_graph.stream(
            input=inputs,
            # debug=True,
            # subgraphs=True,
        ):
            print(thing)
        # output = compiled_graph.invoke(inputs)
        # print(output)
