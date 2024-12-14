from danswer.agent_search.answer_query.states import AnswerQueryOutput
from danswer.agent_search.answer_query.states import AnswerQueryState
from danswer.agent_search.answer_query.states import SearchAnswerResults


def format_answer(state: AnswerQueryState) -> AnswerQueryOutput:
    return AnswerQueryOutput(
        decomp_answer_results=[
            SearchAnswerResults(
                query=state["query_to_answer"],
                quality=state["answer_quality"],
                answer=state["answer"],
                documents=state["reranked_documents"],
            )
        ],
    )
