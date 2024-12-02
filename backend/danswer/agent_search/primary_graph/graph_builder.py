from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph

from danswer.agent_search.primary_graph.edges import continue_to_answer_sub_questions
from danswer.agent_search.primary_graph.edges import continue_to_retrieval
from danswer.agent_search.primary_graph.edges import continue_to_verifier
from danswer.agent_search.primary_graph.nodes import base_check
from danswer.agent_search.primary_graph.nodes import combine_retrieved_docs
from danswer.agent_search.primary_graph.nodes import consolidate_sub_qa
from danswer.agent_search.primary_graph.nodes import custom_retrieve
from danswer.agent_search.primary_graph.nodes import decompose
from danswer.agent_search.primary_graph.nodes import deep_answer_generation
from danswer.agent_search.primary_graph.nodes import final_stuff
from danswer.agent_search.primary_graph.nodes import generate
from danswer.agent_search.primary_graph.nodes import rewrite
from danswer.agent_search.primary_graph.nodes import verifier
from danswer.agent_search.primary_graph.states import QAState
from danswer.agent_search.subgraph.graph_builder import build_subgraph


def build_core_graph() -> StateGraph:
    # Define the nodes we will cycle between
    coreAnswerGraph = StateGraph(QAState)

    # Re-writing the question
    coreAnswerGraph.add_node(node="rewrite", action=rewrite)

    # The retrieval step
    coreAnswerGraph.add_node(node="custom_retrieve", action=custom_retrieve)

    # Combine and dedupe retrieved docs.
    coreAnswerGraph.add_node(
        node="combine_retrieved_docs", action=combine_retrieved_docs
    )

    # Verifying that a retrieved doc is relevant
    coreAnswerGraph.add_node(node="verifier", action=verifier)

    sub_answers_graph = build_subgraph()
    # Answering a sub-question
    coreAnswerGraph.add_node(node="sub_answers_graph", action=sub_answers_graph)

    # A final clean-up step
    coreAnswerGraph.add_node(node="final_stuff", action=final_stuff)

    # Decomposing the question into sub-questions
    coreAnswerGraph.add_node(node="decompose", action=decompose)

    # Checking whether the initial answer is in the ballpark
    coreAnswerGraph.add_node(node="base_check", action=base_check)

    # Generating a response after we know the documents are relevant
    coreAnswerGraph.add_node(node="generate", action=generate)

    # Consolidating the sub-questions and answers
    coreAnswerGraph.add_node(node="consolidate_sub_qa", action=consolidate_sub_qa)

    # Generating a deep answer
    coreAnswerGraph.add_node(
        node="deep_answer_generation", action=deep_answer_generation
    )

    ### Edges ###

    # start by rewriting the prompt
    coreAnswerGraph.add_edge(start_key=START, end_key="rewrite")

    # Kick off another flow to decompose the question into sub-questions
    coreAnswerGraph.add_edge(start_key=START, end_key="decompose")

    coreAnswerGraph.add_conditional_edges(
        source="rewrite",
        path=continue_to_retrieval,
        path_map={"custom_retrieve": "custom_retrieve"},
    )

    # check whether answer addresses the question
    coreAnswerGraph.add_edge(
        start_key="custom_retrieve", end_key="combine_retrieved_docs"
    )

    coreAnswerGraph.add_conditional_edges(
        source="combine_retrieved_docs",
        path=continue_to_verifier,
        path_map={"verifier": "verifier"},
    )

    coreAnswerGraph.add_conditional_edges(
        source="decompose",
        path=continue_to_answer_sub_questions,
        path_map={"sub_answers_graph": "sub_answers_graph"},
    )

    # use the retrieved information to generate the answer
    coreAnswerGraph.add_edge(start_key="verifier", end_key="generate")

    # check whether answer addresses the question
    coreAnswerGraph.add_edge(start_key="generate", end_key="base_check")

    coreAnswerGraph.add_edge(
        start_key="sub_answers_graph", end_key="consolidate_sub_qa"
    )

    coreAnswerGraph.add_edge(
        start_key="consolidate_sub_qa", end_key="deep_answer_generation"
    )

    coreAnswerGraph.add_edge(
        start_key=["base_check", "deep_answer_generation"], end_key="final_stuff"
    )

    coreAnswerGraph.add_edge(start_key="final_stuff", end_key=END)
    coreAnswerGraph.compile()

    return coreAnswerGraph
