from langchain_core.messages import HumanMessage

from danswer.agent_search.main.states import InitialAnswerOutput
from danswer.agent_search.main.states import MainState
from danswer.agent_search.shared_graph_utils.prompts import INITIAL_RAG_PROMPT
from danswer.agent_search.shared_graph_utils.utils import format_docs


def generate_initial_answer(state: MainState) -> InitialAnswerOutput:
    print("---GENERATE INITIAL---")

    question = state["search_request"].query
    docs = state["documents"]

    decomp_answer_results = state["decomp_answer_results"]

    good_qa_list: list[str] = []

    _SUB_QUESTION_ANSWER_TEMPLATE = """
    Sub-Question:\n  - {sub_question}\n  --\nAnswer:\n  - {sub_answer}\n\n
    """
    for decomp_answer_result in decomp_answer_results:
        if (
            decomp_answer_result.quality == "yes"
            and len(decomp_answer_result.answer) > 0
            and decomp_answer_result.answer != "I don't know"
        ):
            good_qa_list.append(
                _SUB_QUESTION_ANSWER_TEMPLATE.format(
                    sub_question=decomp_answer_result.query,
                    sub_answer=decomp_answer_result.answer,
                )
            )

    sub_question_answer_str = "\n\n------\n\n".join(good_qa_list)

    msg = [
        HumanMessage(
            content=INITIAL_RAG_PROMPT.format(
                question=question,
                context=format_docs(docs),
                answered_sub_questions=sub_question_answer_str,
            )
        )
    ]

    # Grader
    model = state["fast_llm"]
    response = model.invoke(msg)

    return InitialAnswerOutput(initial_answer=response.pretty_repr())
