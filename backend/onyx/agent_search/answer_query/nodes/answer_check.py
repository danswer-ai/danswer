from langchain_core.messages import HumanMessage
from langchain_core.messages import merge_message_runs

from onyx.agent_search.answer_query.states import AnswerQueryState
from onyx.agent_search.answer_query.states import QACheckOutput
from onyx.agent_search.shared_graph_utils.prompts import BASE_CHECK_PROMPT


def answer_check(state: AnswerQueryState) -> QACheckOutput:
    msg = [
        HumanMessage(
            content=BASE_CHECK_PROMPT.format(
                question=state["search_request"].query,
                base_answer=state["answer"],
            )
        )
    ]

    fast_llm = state["fast_llm"]
    response = list(
        fast_llm.stream(
            prompt=msg,
        )
    )

    response_str = merge_message_runs(response, chunk_separator="")[0].content

    return QACheckOutput(
        answer_quality=response_str,
    )
