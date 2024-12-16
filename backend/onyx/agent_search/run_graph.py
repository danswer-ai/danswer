from onyx.agent_search.main.graph_builder import main_graph_builder
from onyx.chat.answer import AnswerStream
from onyx.llm.interfaces import LLM
from onyx.tools.tool import Tool


def run_graph(
    query: str,
    llm: LLM,
    tools: list[Tool],
) -> AnswerStream:
    graph = main_graph_builder()

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
