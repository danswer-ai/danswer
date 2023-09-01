import re
from collections.abc import Iterator
from dataclasses import asdict

from danswer.direct_qa.interfaces import DanswerAnswerPiece
from danswer.direct_qa.qa_block import dict_based_prompt_to_langchain_prompt
from danswer.llm.build import get_default_llm
from danswer.server.models import QueryValidationResponse
from danswer.server.utils import get_json_line

REASONING_PAT = "REASONING: "
ANSWERABLE_PAT = "ANSWERABLE: "
COT_PAT = "\nLet's think step by step"


def get_query_validation_messages(user_query: str) -> list[dict[str, str]]:
    messages = [
        {
            "role": "system",
            "content": f"You are a helper tool to determine if a query is answerable using retrieval augmented "
            f"generation. A system will try to answer the user query based on ONLY the top 5 most relevant "
            f"documents found from search. Sources contain both up to date and proprietary information for "
            f"the specific team. For named or unknown entities, assume the search will always find "
            f"consistent knowledge about the entity. Determine if that system should attempt to answer. "
            f'"{ANSWERABLE_PAT}" must be exactly "True" or "False"',
        },
        {"role": "user", "content": "What is this Slack channel about?"},
        {
            "role": "assistant",
            "content": f"{REASONING_PAT}First the system must determine which Slack channel is being referred to."
            f"By fetching 5 documents related to Slack channel contents, it is not possible to determine"
            f"which Slack channel the user is referring to.\n{ANSWERABLE_PAT}False",
        },
        {
            "role": "user",
            "content": f"Danswer is unreachable.{COT_PAT}",
        },
        {
            "role": "assistant",
            "content": f"{REASONING_PAT}The system searches documents related to Danswer being "
            f"unreachable. Assuming the documents from search contains situations where Danswer is not "
            f"reachable and contains a fix, the query is answerable.\n{ANSWERABLE_PAT}True",
        },
        {"role": "user", "content": f"How many customers do we have?{COT_PAT}"},
        {
            "role": "assistant",
            "content": f"{REASONING_PAT}Assuming the searched documents contains customer acquisition information"
            f"including a list of customers, the query can be answered.\n{ANSWERABLE_PAT}True",
        },
        {"role": "user", "content": user_query + COT_PAT},
    ]

    return messages


def extract_answerability_reasoning(model_raw: str) -> str:
    reasoning_match = re.search(
        f"{REASONING_PAT}(.*?){ANSWERABLE_PAT}", model_raw, re.DOTALL
    )
    reasoning_text = reasoning_match.group(1).strip() if reasoning_match else ""
    return reasoning_text


def extract_answerability_bool(model_raw: str) -> bool:
    answerable_match = re.search(f"{ANSWERABLE_PAT}(.+)", model_raw)
    answerable_text = answerable_match.group(1).strip() if answerable_match else ""
    answerable = True if answerable_text.strip().lower() in ["true", "yes"] else False
    return answerable


def get_query_answerability(user_query: str) -> tuple[str, bool]:
    messages = get_query_validation_messages(user_query)
    filled_llm_prompt = dict_based_prompt_to_langchain_prompt(messages)
    model_output = get_default_llm().invoke(filled_llm_prompt)

    reasoning = extract_answerability_reasoning(model_output)
    answerable = extract_answerability_bool(model_output)

    return reasoning, answerable


def stream_query_answerability(user_query: str) -> Iterator[str]:
    messages = get_query_validation_messages(user_query)
    filled_llm_prompt = dict_based_prompt_to_langchain_prompt(messages)
    tokens = get_default_llm().stream(filled_llm_prompt)
    reasoning_pat_found = False
    model_output = ""
    hold_answerable = ""
    for token in tokens:
        model_output = model_output + token

        if ANSWERABLE_PAT in model_output:
            continue

        if not reasoning_pat_found and REASONING_PAT in model_output:
            reasoning_pat_found = True
            remaining = model_output[len(REASONING_PAT) :]
            if remaining:
                yield get_json_line(asdict(DanswerAnswerPiece(answer_piece=remaining)))
            continue

        if reasoning_pat_found:
            hold_answerable = hold_answerable + token
            if hold_answerable == ANSWERABLE_PAT[: len(hold_answerable)]:
                continue
            yield get_json_line(
                asdict(DanswerAnswerPiece(answer_piece=hold_answerable))
            )
            hold_answerable = ""

    reasoning = extract_answerability_reasoning(model_output)
    answerable = extract_answerability_bool(model_output)

    yield get_json_line(
        QueryValidationResponse(reasoning=reasoning, answerable=answerable).dict()
    )
    return
