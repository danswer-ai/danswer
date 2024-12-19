from onyx.agent_search.answer_question.states import AnswerQuestionOutput
from onyx.agent_search.answer_question.states import AnswerQuestionState
from onyx.agent_search.answer_question.states import QuestionAnswerResults


def format_answer(state: AnswerQuestionState) -> AnswerQuestionOutput:
    return AnswerQuestionOutput(
        answer_results=[
            QuestionAnswerResults(
                question=state["question"],
                quality=state["answer_quality"],
                answer=state["answer"],
                expanded_retrieval_results=state["expanded_retrieval_results"],
                documents=state["documents"],
            )
        ],
    )
