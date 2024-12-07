from collections.abc import Hashable
from typing import Union

from langchain_core.messages import HumanMessage
from langgraph.types import Send

from danswer.agent_search.base_qa_sub_graph.states import BaseQAState
from danswer.agent_search.primary_graph.states import QAState
from danswer.agent_search.research_qa_sub_graph.states import ResearchQAState
from danswer.agent_search.shared_graph_utils.prompts import BASE_CHECK_PROMPT


def continue_to_initial_sub_questions(
    state: QAState,
) -> Union[Hashable, list[Hashable]]:
    # Routes re-written queries to the (parallel) retrieval steps
    # Notice the 'Send()' API that takes care of the parallelization
    return [
        Send(
            "sub_answers_graph_initial",
            BaseQAState(
                sub_question_str=initial_sub_question["sub_question_str"],
                sub_question_search_queries=initial_sub_question[
                    "sub_question_search_queries"
                ],
                sub_question_nr=initial_sub_question["sub_question_nr"],
                primary_llm=state["primary_llm"],
                fast_llm=state["fast_llm"],
                graph_start_time=state["graph_start_time"],
            ),
        )
        for initial_sub_question in state["initial_sub_questions"]
    ]


def continue_to_answer_sub_questions(state: QAState) -> Union[Hashable, list[Hashable]]:
    # Routes re-written queries to the (parallel) retrieval steps
    # Notice the 'Send()' API that takes care of the parallelization
    return [
        Send(
            "sub_answers_graph",
            ResearchQAState(
                sub_question=sub_question["sub_question_str"],
                sub_question_nr=sub_question["sub_question_nr"],
                graph_start_time=state["graph_start_time"],
                primary_llm=state["primary_llm"],
                fast_llm=state["fast_llm"],
            ),
        )
        for sub_question in state["sub_questions"]
    ]


def continue_to_deep_answer(state: QAState) -> Union[Hashable, list[Hashable]]:
    print("---GO TO DEEP ANSWER OR END---")

    base_answer = state["base_answer"]

    question = state["original_question"]

    BASE_CHECK_MESSAGE = [
        HumanMessage(
            content=BASE_CHECK_PROMPT.format(question=question, base_answer=base_answer)
        )
    ]

    model = state["fast_llm"]
    response = model.invoke(BASE_CHECK_MESSAGE)

    print(f"CAN WE CONTINUE W/O GENERATING A DEEP ANSWER? - {response.pretty_repr()}")

    if response.pretty_repr() == "no":
        return "decompose"
    else:
        return "end"
