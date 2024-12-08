from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph

from danswer.agent_search.core_qa_graph.edges import sub_continue_to_retrieval
from danswer.agent_search.core_qa_graph.edges import sub_continue_to_verifier
from danswer.agent_search.core_qa_graph.nodes.combine_retrieved_docs import (
    sub_combine_retrieved_docs,
)
from danswer.agent_search.core_qa_graph.nodes.custom_retrieve import (
    sub_custom_retrieve,
)
from danswer.agent_search.core_qa_graph.nodes.dummy import sub_dummy
from danswer.agent_search.core_qa_graph.nodes.final_format import (
    sub_final_format,
)
from danswer.agent_search.core_qa_graph.nodes.generate import sub_generate
from danswer.agent_search.core_qa_graph.nodes.qa_check import sub_qa_check
from danswer.agent_search.core_qa_graph.nodes.rewrite import sub_rewrite
from danswer.agent_search.core_qa_graph.nodes.verifier import sub_verifier
from danswer.agent_search.core_qa_graph.states import BaseQAOutputState
from danswer.agent_search.core_qa_graph.states import BaseQAState
from danswer.agent_search.core_qa_graph.states import CoreQAInputState


def build_core_qa_graph() -> StateGraph:
    sub_answers_initial = StateGraph(
        state_schema=BaseQAState,
        output=BaseQAOutputState,
    )

    ### Add nodes ###
    sub_answers_initial.add_node(node="sub_dummy", action=sub_dummy)
    sub_answers_initial.add_node(node="sub_rewrite", action=sub_rewrite)
    sub_answers_initial.add_node(
        node="sub_custom_retrieve",
        action=sub_custom_retrieve,
    )
    sub_answers_initial.add_node(
        node="sub_combine_retrieved_docs",
        action=sub_combine_retrieved_docs,
    )
    sub_answers_initial.add_node(
        node="sub_verifier",
        action=sub_verifier,
    )
    sub_answers_initial.add_node(
        node="sub_generate",
        action=sub_generate,
    )
    sub_answers_initial.add_node(
        node="sub_qa_check",
        action=sub_qa_check,
    )
    sub_answers_initial.add_node(
        node="sub_final_format",
        action=sub_final_format,
    )

    ### Add edges ###
    sub_answers_initial.add_edge(START, "sub_dummy")
    sub_answers_initial.add_edge("sub_dummy", "sub_rewrite")

    sub_answers_initial.add_conditional_edges(
        source="sub_rewrite",
        path=sub_continue_to_retrieval,
    )

    sub_answers_initial.add_edge(
        start_key="sub_custom_retrieve",
        end_key="sub_combine_retrieved_docs",
    )

    sub_answers_initial.add_conditional_edges(
        source="sub_combine_retrieved_docs",
        path=sub_continue_to_verifier,
        path_map=["sub_verifier"],
    )

    sub_answers_initial.add_edge(
        start_key="sub_verifier",
        end_key="sub_generate",
    )

    sub_answers_initial.add_edge(
        start_key="sub_generate",
        end_key="sub_qa_check",
    )

    sub_answers_initial.add_edge(
        start_key="sub_qa_check",
        end_key="sub_final_format",
    )

    sub_answers_initial.add_edge(
        start_key="sub_final_format",
        end_key=END,
    )
    # sub_answers_graph = sub_answers_initial.compile()
    return sub_answers_initial


if __name__ == "__main__":
    inputs = CoreQAInputState(
        #original_question="Whose music is kind of hard to easily enjoy?",
        #sub_question_str="Whose music is kind of hard to easily enjoy?",
        original_question="What is voice leading?",
        sub_question_str="How can I best understand music theory using voice leading?",
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
