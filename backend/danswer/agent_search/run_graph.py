from danswer.agent_search.primary_graph.graph_builder import build_core_graph
from danswer.llm.answering.answer import AnswerStream
from danswer.llm.interfaces import LLM
from danswer.tools.tool import Tool


def run_graph(
    query: str,
    llm: LLM,
    tools: list[Tool],
) -> AnswerStream:
    graph = build_core_graph()

    inputs = {
        "original_query": query,
        "messages": [],
        "tools": tools,
        "llm": llm,
    }
    compiled_graph = graph.compile()
    output = compiled_graph.invoke(input=inputs)
    yield from output


if __name__ == "__main__":
    pass
    # run_graph("What is the capital of France?", llm, [])
