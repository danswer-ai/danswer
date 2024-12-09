from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph

from danswer.agent_search.core_qa_graph.edges import continue_to_retrieval
from danswer.agent_search.core_qa_graph.edges import continue_to_verifier
from danswer.agent_search.core_qa_graph.nodes.custom_retrieve import (
    custom_retrieve,
)
from danswer.agent_search.core_qa_graph.nodes.dummy import dummy
from danswer.agent_search.core_qa_graph.nodes.final_format import (
    final_format,
)
from danswer.agent_search.core_qa_graph.nodes.generate import generate
from danswer.agent_search.core_qa_graph.nodes.qa_check import qa_check
from danswer.agent_search.core_qa_graph.nodes.rewrite import rewrite
from danswer.agent_search.core_qa_graph.nodes.verifier import verifier
from danswer.agent_search.core_qa_graph.states import BaseQAOutputState
from danswer.agent_search.core_qa_graph.states import BaseQAState
from danswer.agent_search.core_qa_graph.states import CoreQAInputState
from danswer.agent_search.util_sub_graphs.collect_docs import collect_docs
from danswer.agent_search.util_sub_graphs.dedupe_retrieved_docs import (
    build_dedupe_retrieved_docs_graph,
)

# from danswer.agent_search.core_qa_graph.nodes.combine_retrieved_docs import combine_retrieved_docs


def build_core_qa_graph() -> StateGraph:
    answers_initial = StateGraph(
        state_schema=BaseQAState,
        output=BaseQAOutputState,
    )

    ### Add nodes ###
    answers_initial.add_node(node="dummy", action=dummy)
    answers_initial.add_node(node="rewrite", action=rewrite)
    answers_initial.add_node(
        node="custom_retrieve",
        action=custom_retrieve,
    )
    # answers_initial.add_node(
    #     node="collect_docs",
    #     action=collect_docs,
    # )
    build_dedupe_retrieved_docs_graph().compile()
    answers_initial.add_node(
        node="collect_docs",
        action=collect_docs,
    )
    answers_initial.add_node(
        node="verifier",
        action=verifier,
    )
    answers_initial.add_node(
        node="generate",
        action=generate,
    )
    answers_initial.add_node(
        node="qa_check",
        action=qa_check,
    )
    answers_initial.add_node(
        node="final_format",
        action=final_format,
    )

    ### Add edges ###
    answers_initial.add_edge(START, "dummy")
    answers_initial.add_edge("dummy", "rewrite")

    answers_initial.add_conditional_edges(
        source="rewrite",
        path=continue_to_retrieval,
    )

    answers_initial.add_edge(
        start_key="custom_retrieve",
        end_key="collect_docs",
    )

    answers_initial.add_conditional_edges(
        source="collect_docs",
        path=continue_to_verifier,
    )

    answers_initial.add_edge(
        start_key="verifier",
        end_key="generate",
    )

    answers_initial.add_edge(
        start_key="generate",
        end_key="qa_check",
    )

    answers_initial.add_edge(
        start_key="qa_check",
        end_key="final_format",
    )

    answers_initial.add_edge(
        start_key="final_format",
        end_key=END,
    )
    # answers_graph = answers_initial.compile()
    return answers_initial


if __name__ == "__main__":
    inputs = CoreQAInputState(
        original_question="Whose music is kind of hard to easily enjoy?",
        sub_question_str="Whose music is kind of hard to easily enjoy?",
    )
    sub_answers_graph = build_core_qa_graph()
    compiled_sub_answers = sub_answers_graph.compile()
    output = compiled_sub_answers.invoke(inputs)
    print("\nOUTPUT:")
    print(output.keys())
    for key, value in output.items():
        if key in [
            "sub_question_answer",
            "sub_question_str",
            "sub_qas",
            "initial_sub_qas",
            "sub_question_answer",
        ]:
            print(f"{key}: {value}")
