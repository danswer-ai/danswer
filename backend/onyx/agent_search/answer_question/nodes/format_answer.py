from onyx.agent_search.answer_question.states import AnswerQueryOutput
from onyx.agent_search.answer_question.states import AnswerQueryState
from onyx.agent_search.answer_question.states import SearchAnswerResults


def format_answer(state: AnswerQueryState) -> AnswerQueryOutput:
    return AnswerQueryOutput(
        answer_results=[
            SearchAnswerResults(
                question=state["question"],
                quality=state["answer_quality"],
                answer=state["answer"],
                expanded_retrieval_results=state["expanded_retrieval_results"],
                documents=state["documents"],
            )
        ],
    )
