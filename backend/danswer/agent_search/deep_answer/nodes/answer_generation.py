from typing import Any

from langchain_core.messages import HumanMessage

from danswer.agent_search.main.states import MainState
from danswer.agent_search.shared_graph_utils.prompts import COMBINED_CONTEXT
from danswer.agent_search.shared_graph_utils.prompts import MODIFIED_RAG_PROMPT
from danswer.agent_search.shared_graph_utils.utils import format_docs
from danswer.agent_search.shared_graph_utils.utils import normalize_whitespace


# aggregate sub questions and answers
def deep_answer_generation(state: MainState) -> dict[str, Any]:
    """
    Generate answer

    Args:
        state (messages): The current state

    Returns:
         dict: The updated state with re-phrased question
    """
    print("---DEEP GENERATE---")

    question = state["original_question"]
    docs = state["deduped_retrieval_docs"]

    deep_answer_context = state["core_answer_dynamic_context"]

    print(f"Number of verified retrieval docs - deep: {len(docs)}")

    combined_context = normalize_whitespace(
        COMBINED_CONTEXT.format(
            deep_answer_context=deep_answer_context, formated_docs=format_docs(docs)
        )
    )

    msg = [
        HumanMessage(
            content=MODIFIED_RAG_PROMPT.format(
                question=question, combined_context=combined_context
            )
        )
    ]

    # Grader
    model = state["fast_llm"]
    response = model.invoke(msg)

    return {
        "deep_answer": response.content,
    }


def final_stuff(state: MainState) -> dict[str, Any]:
    """
    Invokes the agent model to generate a response based on the current state. Given
    the question, it will decide to retrieve using the retriever tool, or simply end.

    Args:
        state (messages): The current state

    Returns:
        dict: The updated state with the agent response appended to messages
    """
    print("---FINAL---")

    messages = state["log_messages"]
    time_ordered_messages = [x.pretty_repr() for x in messages]
    time_ordered_messages.sort()

    print("Message Log:")
    print("\n".join(time_ordered_messages))

    initial_sub_qas = state["initial_sub_qas"]
    initial_sub_qa_list = []
    for initial_sub_qa in initial_sub_qas:
        if initial_sub_qa["sub_answer_check"] == "yes":
            initial_sub_qa_list.append(
                f'  Question:\n  {initial_sub_qa["sub_question"]}\n  --\n  Answer:\n  {initial_sub_qa["sub_answer"]}\n  -----'
            )

    initial_sub_qa_context = "\n".join(initial_sub_qa_list)

    base_answer = state["base_answer"]

    print(f"Final Base Answer:\n{base_answer}")
    print("--------------------------------")
    print(f"Initial Answered Sub Questions:\n{initial_sub_qa_context}")
    print("--------------------------------")

    if not state.get("deep_answer"):
        print("No Deep Answer was required")
        return {}

    deep_answer = state["deep_answer"]
    sub_qas = state["sub_qas"]
    sub_qa_list = []
    for sub_qa in sub_qas:
        if sub_qa["sub_answer_check"] == "yes":
            sub_qa_list.append(
                f'  Question:\n  {sub_qa["sub_question"]}\n  --\n  Answer:\n  {sub_qa["sub_answer"]}\n  -----'
            )

    sub_qa_context = "\n".join(sub_qa_list)

    print(f"Final Base Answer:\n{base_answer}")
    print("--------------------------------")
    print(f"Final Deep Answer:\n{deep_answer}")
    print("--------------------------------")
    print("Sub Questions and Answers:")
    print(sub_qa_context)

    return {}
