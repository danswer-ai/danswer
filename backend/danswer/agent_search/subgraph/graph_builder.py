from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph

from danswer.agent_search.subgraph.edges import sub_continue_to_retrieval
from danswer.agent_search.subgraph.edges import sub_continue_to_verifier
from danswer.agent_search.subgraph.nodes import sub_combine_retrieved_docs
from danswer.agent_search.subgraph.nodes import sub_custom_retrieve
from danswer.agent_search.subgraph.nodes import sub_final_format
from danswer.agent_search.subgraph.nodes import sub_generate
from danswer.agent_search.subgraph.nodes import sub_qa_check
from danswer.agent_search.subgraph.nodes import sub_rewrite
from danswer.agent_search.subgraph.nodes import verifier
from danswer.agent_search.subgraph.states import SubQAOutputState
from danswer.agent_search.subgraph.states import SubQAState


def build_subgraph() -> StateGraph:
    sub_answers = StateGraph(SubQAState, output=SubQAOutputState)
    sub_answers.add_node(node="sub_rewrite", action=sub_rewrite)
    sub_answers.add_node(node="sub_custom_retrieve", action=sub_custom_retrieve)
    sub_answers.add_node(
        node="sub_combine_retrieved_docs", action=sub_combine_retrieved_docs
    )
    sub_answers.add_node(node="verifier", action=verifier)
    sub_answers.add_node(node="sub_generate", action=sub_generate)
    sub_answers.add_node(node="sub_qa_check", action=sub_qa_check)
    sub_answers.add_node(node="sub_final_format", action=sub_final_format)

    sub_answers.add_edge(START, "sub_rewrite")

    sub_answers.add_conditional_edges(
        "sub_rewrite", sub_continue_to_retrieval, ["sub_custom_retrieve"]
    )

    sub_answers.add_edge("sub_custom_retrieve", "sub_combine_retrieved_docs")

    sub_answers.add_conditional_edges(
        "sub_combine_retrieved_docs", sub_continue_to_verifier, ["verifier"]
    )

    sub_answers.add_edge("verifier", "sub_generate")

    sub_answers.add_edge("sub_generate", "sub_qa_check")

    sub_answers.add_edge("sub_qa_check", "sub_final_format")

    sub_answers.add_edge("sub_final_format", END)
    sub_answers_graph = sub_answers.compile()
    return sub_answers_graph


if __name__ == "__main__":
    # TODO: add the actual question
    inputs = {"sub_question": "Whose music is kind of hard to easily enjoy?"}
    sub_answers_graph = build_subgraph()
    output = sub_answers_graph.invoke(inputs)
    print("\nOUTPUT:")
    print(output)
