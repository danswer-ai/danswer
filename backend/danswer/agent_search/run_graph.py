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
        "original_question": query,
        "messages": [],
        "tools": tools,
        "llm": llm,
    }
    output = graph.invoke(input=inputs)
    yield from output
