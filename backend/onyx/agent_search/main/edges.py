from collections.abc import Hashable

from langgraph.types import Send

from onyx.agent_search.answer_question.states import AnswerQuestionInput
from onyx.agent_search.core_state import extract_core_fields
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalInput
from onyx.agent_search.main.states import MainInput
from onyx.agent_search.main.states import MainState


def parallelize_decompozed_answer_queries(state: MainState) -> list[Send | Hashable]:
    return [
        Send(
            "answer_query",
            AnswerQuestionInput(
                **extract_core_fields(state),
                question=question,
            ),
        )
        for question in state["initial_decomp_questions"]
    ]


def send_to_initial_retrieval(state: MainInput) -> list[Send | Hashable]:
    return [
        Send(
            "initial_retrieval",
            ExpandedRetrievalInput(
                **extract_core_fields(state),
                question=state["search_request"].query,
            ),
        )
    ]


# def continue_to_answer_sub_questions(state: QAState) -> Union[Hashable, list[Hashable]]:
#     # Routes re-written queries to the (parallel) retrieval steps
#     # Notice the 'Send()' API that takes care of the parallelization
#     return [
#         Send(
#             "sub_answers_graph",
#             ResearchQAState(
#                 sub_question=sub_question["sub_question_str"],
#                 sub_question_nr=sub_question["sub_question_nr"],
#                 graph_start_time=state["graph_start_time"],
#                 primary_llm=state["primary_llm"],
#                 fast_llm=state["fast_llm"],
#             ),
#         )
#         for sub_question in state["sub_questions"]
#     ]


# def continue_to_deep_answer(state: QAState) -> Union[Hashable, list[Hashable]]:
#     print("---GO TO DEEP ANSWER OR END---")

#     base_answer = state["base_answer"]

#     question = state["original_question"]

#     BASE_CHECK_MESSAGE = [
#         HumanMessage(
#             content=BASE_CHECK_PROMPT.format(question=question, base_answer=base_answer)
#         )
#     ]

#     model = state["fast_llm"]
#     response = model.invoke(BASE_CHECK_MESSAGE)

#     print(f"CAN WE CONTINUE W/O GENERATING A DEEP ANSWER? - {response.pretty_repr()}")

#     if response.pretty_repr() == "no":
#         return "decompose"
#     else:
#         return "end"
