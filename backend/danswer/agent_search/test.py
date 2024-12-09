from typing import Annotated
from typing import Literal
from typing import TypedDict

from dotenv import load_dotenv
from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph
from langgraph.types import Send


def unique_concat(a: list[str], b: list[str]) -> list[str]:
    combined = a + b
    return list(set(combined))


load_dotenv(".vscode/.env")


class InputState(TypedDict):
    user_input: str
    # str_arr: list[str]


class OutputState(TypedDict):
    graph_output: str


class SharedState(TypedDict):
    llm: int


class OverallState(TypedDict):
    foo: str
    user_input: str
    str_arr: Annotated[list[str], unique_concat]
    # str_arr: list[str]


class PrivateState(TypedDict):
    foo: str
    bar: str


def conditional_edge_3(state: PrivateState) -> Literal["node_4"]:
    print(f"conditional_edge_3: {state}")
    return Send(
        "node_4",
        state,
    )


def node_1(state: OverallState):
    print(f"node_1: {state}")
    return {
        "foo": state["user_input"] + " name",
        "user_input": state["user_input"],
        "str_arr": ["a", "b", "c"],
    }


def node_2(state: OverallState):
    print(f"node_2: {state}")
    return {
        "foo": "foo",
        "bar": "bar",
        "test1": "test1",
        "str_arr": ["a", "d", "e", "f"],
    }


def node_3(state: PrivateState):
    print(f"node_3: {state}")
    return {"bar": state["bar"] + " Lance"}


def node_4(state: PrivateState):
    print(f"node_4: {state}")
    return {
        "foo": state["bar"] + " more bar",
    }


def node_5(state: OverallState):
    print(f"node_5: {state}")
    updated_aggregate = [item for item in state["str_arr"] if "b" not in item]
    print(f"updated_aggregate: {updated_aggregate}")
    return {"str_arr": updated_aggregate}


builder = StateGraph(
    state_schema=OverallState,
    # input=InputState,
    # output=OutputState
)
builder.add_node("node_1", node_1)
builder.add_node("node_2", node_2)
builder.add_node("node_3", node_3)
builder.add_node("node_4", node_4)
builder.add_node("node_5", node_5)
builder.add_edge(START, "node_1")
builder.add_edge("node_1", "node_2")
builder.add_edge("node_2", "node_3")
builder.add_conditional_edges(
    source="node_3",
    path=conditional_edge_3,
)
builder.add_edge("node_4", "node_5")
builder.add_edge("node_5", END)
graph = builder.compile()
# output = graph.invoke(
#     {"user_input":"My"},
#     stream_mode="values",
# )
for chunk in graph.stream(
    {"user_input": "My"},
    stream_mode="debug",
):
    print()
    print(chunk)
