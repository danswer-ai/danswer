from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph

from danswer.agent_search.deep_qa_graph.edges import sub_continue_to_retrieval
from danswer.agent_search.deep_qa_graph.edges import sub_continue_to_verifier
from danswer.agent_search.deep_qa_graph.nodes.combine_retrieved_docs import (
    sub_combine_retrieved_docs,
)
from danswer.agent_search.deep_qa_graph.nodes.custom_retrieve import sub_custom_retrieve
from danswer.agent_search.deep_qa_graph.nodes.dummy import sub_dummy
from danswer.agent_search.deep_qa_graph.nodes.final_format import sub_final_format
from danswer.agent_search.deep_qa_graph.nodes.generate import sub_generate
from danswer.agent_search.deep_qa_graph.nodes.qa_check import sub_qa_check
from danswer.agent_search.deep_qa_graph.nodes.verifier import sub_verifier
from danswer.agent_search.deep_qa_graph.states import ResearchQAOutputState
from danswer.agent_search.deep_qa_graph.states import ResearchQAState


def build_deep_qa_graph() -> StateGraph:
    # Define the nodes we will cycle between
    sub_answers = StateGraph(state_schema=ResearchQAState, output=ResearchQAOutputState)

    ### Add Nodes ###

    # Dummy node for initial processing
    sub_answers.add_node(node="sub_dummy", action=sub_dummy)

    # The retrieval step
    sub_answers.add_node(node="sub_custom_retrieve", action=sub_custom_retrieve)

    # The dedupe step
    sub_answers.add_node(
        node="sub_combine_retrieved_docs", action=sub_combine_retrieved_docs
    )

    # Verifying retrieved information
    sub_answers.add_node(node="sub_verifier", action=sub_verifier)

    # Generating the response
    sub_answers.add_node(node="sub_generate", action=sub_generate)

    # Checking the quality of the answer
    sub_answers.add_node(node="sub_qa_check", action=sub_qa_check)

    # Final formatting of the response
    sub_answers.add_node(node="sub_final_format", action=sub_final_format)

    ### Add Edges ###

    # Generate multiple sub-questions
    sub_answers.add_edge(start_key=START, end_key="sub_rewrite")

    # For each sub-question, perform a retrieval in parallel
    sub_answers.add_conditional_edges(
        source="sub_rewrite",
        path=sub_continue_to_retrieval,
        path_map=["sub_custom_retrieve"],
    )

    # Combine the retrieved docs for each sub-question from the parallel retrievals
    sub_answers.add_edge(
        start_key="sub_custom_retrieve", end_key="sub_combine_retrieved_docs"
    )

    # Go over all of the combined retrieved docs and verify them against the original question
    sub_answers.add_conditional_edges(
        source="sub_combine_retrieved_docs",
        path=sub_continue_to_verifier,
        path_map=["sub_verifier"],
    )

    # Generate an answer for each verified retrieved doc
    sub_answers.add_edge(start_key="sub_verifier", end_key="sub_generate")

    # Check the quality of the answer
    sub_answers.add_edge(start_key="sub_generate", end_key="sub_qa_check")

    sub_answers.add_edge(start_key="sub_qa_check", end_key="sub_final_format")

    sub_answers.add_edge(start_key="sub_final_format", end_key=END)

    return sub_answers


if __name__ == "__main__":
    # TODO: add the actual question
    inputs = {"sub_question": "Whose music is kind of hard to easily enjoy?"}
    sub_answers_graph = build_deep_qa_graph()
    compiled_sub_answers = sub_answers_graph.compile()
    output = compiled_sub_answers.invoke(inputs)
    print("\nOUTPUT:")
    print(output)
