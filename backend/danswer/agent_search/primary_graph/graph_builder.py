from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph

from danswer.agent_search.primary_graph.edges import continue_to_answer_sub_questions
from danswer.agent_search.primary_graph.edges import continue_to_deep_answer
from danswer.agent_search.primary_graph.edges import continue_to_initial_sub_questions
from danswer.agent_search.primary_graph.nodes import base_wait
from danswer.agent_search.primary_graph.nodes import combine_retrieved_docs
from danswer.agent_search.primary_graph.nodes import custom_retrieve
from danswer.agent_search.primary_graph.nodes import entity_term_extraction
from danswer.agent_search.primary_graph.nodes import final_stuff
from danswer.agent_search.primary_graph.nodes import generate_initial
from danswer.agent_search.primary_graph.nodes import main_decomp_base
from danswer.agent_search.primary_graph.nodes import rewrite
from danswer.agent_search.primary_graph.nodes import verifier
from danswer.agent_search.primary_graph.states import QAState


def build_core_graph() -> StateGraph:
    # Define the nodes we will cycle between
    core_answer_graph = StateGraph(state_schema=QAState)

    ### Add Nodes ###

    # Re-writing the question
    core_answer_graph.add_node(node="rewrite", action=rewrite)

    # The retrieval step
    core_answer_graph.add_node(node="custom_retrieve", action=custom_retrieve)

    # Combine and dedupe retrieved docs.
    core_answer_graph.add_node(
        node="combine_retrieved_docs", action=combine_retrieved_docs
    )

    # Extract entities, terms and relationships
    core_answer_graph.add_node(
        node="entity_term_extraction", action=entity_term_extraction
    )

    # Verifying that a retrieved doc is relevant
    core_answer_graph.add_node(node="verifier", action=verifier)

    # Initial question decomposition
    core_answer_graph.add_node(node="main_decomp_base", action=main_decomp_base)

    # Checking whether the initial answer is in the ballpark
    core_answer_graph.add_node(node="base_wait", action=base_wait)

    # A final clean-up step
    core_answer_graph.add_node(node="final_stuff", action=final_stuff)

    # Generating a response after we know the documents are relevant
    core_answer_graph.add_node(node="generate_initial", action=generate_initial)

    ### Add Edges ###

    # start the initial sub-question decomposition
    core_answer_graph.add_edge(start_key=START, end_key="main_decomp_base")
    core_answer_graph.add_conditional_edges(
        source="main_decomp_base",
        path=continue_to_initial_sub_questions,
        path_map={"sub_answers_graph_initial": "sub_answers_graph_initial"},
    )

    # use the retrieved information to generate the answer
    core_answer_graph.add_edge(
        start_key=["verifier", "sub_answers_graph_initial"], end_key="generate_initial"
    )
    core_answer_graph.add_edge(start_key="generate_initial", end_key="base_wait")

    core_answer_graph.add_conditional_edges(
        source="base_wait",
        path=continue_to_deep_answer,
        path_map={"decompose": "entity_term_extraction", "end": "final_stuff"},
    )

    core_answer_graph.add_edge(start_key="entity_term_extraction", end_key="decompose")

    core_answer_graph.add_edge(start_key="decompose", end_key="sub_qa_manager")
    core_answer_graph.add_conditional_edges(
        source="sub_qa_manager",
        path=continue_to_answer_sub_questions,
        path_map={"sub_answers_graph": "sub_answers_graph"},
    )

    core_answer_graph.add_edge(
        start_key="sub_answers_graph", end_key="sub_qa_level_aggregator"
    )

    core_answer_graph.add_edge(
        start_key="sub_qa_level_aggregator", end_key="deep_answer_generation"
    )

    core_answer_graph.add_edge(
        start_key="deep_answer_generation", end_key="final_stuff"
    )

    core_answer_graph.add_edge(start_key="final_stuff", end_key=END)
    core_answer_graph.compile()

    return core_answer_graph
