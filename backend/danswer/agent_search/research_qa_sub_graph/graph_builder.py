from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph

from danswer.agent_search.research_qa_sub_graph.edges import sub_continue_to_retrieval
from danswer.agent_search.research_qa_sub_graph.edges import sub_continue_to_verifier
from danswer.agent_search.research_qa_sub_graph.nodes import sub_combine_retrieved_docs
from danswer.agent_search.research_qa_sub_graph.nodes import sub_custom_retrieve
from danswer.agent_search.research_qa_sub_graph.nodes import sub_dummy
from danswer.agent_search.research_qa_sub_graph.nodes import sub_final_format
from danswer.agent_search.research_qa_sub_graph.nodes import sub_generate
from danswer.agent_search.research_qa_sub_graph.nodes import sub_qa_check
from danswer.agent_search.research_qa_sub_graph.nodes import sub_verifier
from danswer.agent_search.research_qa_sub_graph.states import ResearchQAOutputState
from danswer.agent_search.research_qa_sub_graph.states import ResearchQAState

# from danswer.agent_search.research_qa_sub_graph.nodes import sub_rewrite


def build_base_qa_sub_graph() -> StateGraph:
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

    sub_answers.add_edge(start_key=START, end_key="sub_rewrite")

    sub_answers.add_conditional_edges(
        source="sub_rewrite",
        path=sub_continue_to_retrieval,
        path_map=["sub_custom_retrieve"],
    )

    sub_answers.add_edge(
        start_key="sub_custom_retrieve", end_key="sub_combine_retrieved_docs"
    )

    sub_answers.add_conditional_edges(
        source="sub_combine_retrieved_docs",
        path=sub_continue_to_verifier,
        path_map=["sub_verifier"],
    )

    sub_answers.add_edge(start_key="sub_verifier", end_key="sub_generate")

    sub_answers.add_edge(start_key="sub_generate", end_key="sub_qa_check")

    sub_answers.add_edge(start_key="sub_qa_check", end_key="sub_final_format")

    sub_answers.add_edge(start_key="sub_final_format", end_key=END)

    return sub_answers


if __name__ == "__main__":
    # TODO: add the actual question
    inputs = {"sub_question": "Whose music is kind of hard to easily enjoy?"}
    sub_answers_graph = build_base_qa_sub_graph()
    compiled_sub_answers = sub_answers_graph.compile()
    output = compiled_sub_answers.invoke(inputs)
    print("\nOUTPUT:")
    print(output)
