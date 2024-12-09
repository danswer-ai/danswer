from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph

from danswer.agent_search.core_qa_graph.nodes.rewrite import rewrite
from danswer.agent_search.deep_qa_graph.edges import continue_to_retrieval
from danswer.agent_search.deep_qa_graph.edges import continue_to_verifier
from danswer.agent_search.deep_qa_graph.nodes.combine_retrieved_docs import (
    combine_retrieved_docs,
)
from danswer.agent_search.deep_qa_graph.nodes.custom_retrieve import custom_retrieve
from danswer.agent_search.deep_qa_graph.nodes.final_format import final_format
from danswer.agent_search.deep_qa_graph.nodes.generate import generate
from danswer.agent_search.deep_qa_graph.nodes.qa_check import qa_check
from danswer.agent_search.deep_qa_graph.nodes.verifier import verifier
from danswer.agent_search.deep_qa_graph.states import ResearchQAOutputState
from danswer.agent_search.deep_qa_graph.states import ResearchQAState


def build_deep_qa_graph() -> StateGraph:
    # Define the nodes we will cycle between
    answers = StateGraph(state_schema=ResearchQAState, output=ResearchQAOutputState)

    ### Add Nodes ###

    # Dummy node for initial processing
    # answers.add_node(node="dummy", action=dummy)
    answers.add_node(node="rewrite", action=rewrite)

    # The retrieval step
    answers.add_node(node="custom_retrieve", action=custom_retrieve)

    # The dedupe step
    answers.add_node(node="combine_retrieved_docs", action=combine_retrieved_docs)

    # Verifying retrieved information
    answers.add_node(node="verifier", action=verifier)

    # Generating the response
    answers.add_node(node="generate", action=generate)

    # Checking the quality of the answer
    answers.add_node(node="qa_check", action=qa_check)

    # Final formatting of the response
    answers.add_node(node="final_format", action=final_format)

    ### Add Edges ###

    # Generate multiple sub-questions
    answers.add_edge(start_key=START, end_key="rewrite")

    # For each sub-question, perform a retrieval in parallel
    answers.add_conditional_edges(
        source="rewrite",
        path=continue_to_retrieval,
        path_map=["custom_retrieve"],
    )

    # Combine the retrieved docs for each sub-question from the parallel retrievals
    answers.add_edge(start_key="custom_retrieve", end_key="combine_retrieved_docs")

    # Go over all of the combined retrieved docs and verify them against the original question
    answers.add_conditional_edges(
        source="combine_retrieved_docs",
        path=continue_to_verifier,
        path_map=["verifier"],
    )

    # Generate an answer for each verified retrieved doc
    answers.add_edge(start_key="verifier", end_key="generate")

    # Check the quality of the answer
    answers.add_edge(start_key="generate", end_key="qa_check")

    answers.add_edge(start_key="qa_check", end_key="final_format")

    answers.add_edge(start_key="final_format", end_key=END)

    return answers


if __name__ == "__main__":
    # TODO: add the actual question
    inputs = {"question": "Whose music is kind of hard to easily enjoy?"}
    answers_graph = build_deep_qa_graph()
    compiled_answers = answers_graph.compile()
    output = compiled_answers.invoke(inputs)
    print("\nOUTPUT:")
    print(output)
