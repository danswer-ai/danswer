import re
from collections.abc import Iterator
from dataclasses import asdict

from danswer.configs.constants import CODE_BLOCK_PAT
from danswer.configs.constants import GENERAL_SEP_PAT
from danswer.direct_qa.interfaces import DanswerAnswerPiece
from danswer.direct_qa.qa_block import dict_based_prompt_to_langchain_prompt
from danswer.llm.build import get_default_llm
from danswer.server.models import QueryValidationResponse
from danswer.server.utils import get_json_line

QUERY_PAT = "QUERY: "
REASONING_PAT = "THOUGHT: "
ANSWERABLE_PAT = "ANSWERABLE: "


def get_query_validation_messages(user_query: str) -> list[dict[str, str]]:
    ambiguous_example_question = f"{QUERY_PAT}What is this Slack channel about?"
    ambiguous_example_answer = (
        f"{REASONING_PAT}First the system must determine which Slack channel is "
        f"being referred to. By fetching 5 documents related to Slack channel contents, "
        f"it is not possible to determine which Slack channel the user is referring to.\n"
        f"{ANSWERABLE_PAT}False"
    )

    debug_example_question = f"{QUERY_PAT}Danswer is unreachable."
    debug_example_answer = (
        f"{REASONING_PAT}The system searches documents related to Danswer being "
        f"unreachable. Assuming the documents from search contains situations where "
        f"Danswer is not reachable and contains a fix, the query may be answerable.\n"
        f"{ANSWERABLE_PAT}True"
    )

    up_to_date_example_question = f"{QUERY_PAT}How many customers do we have"
    up_to_date_example_answer = (
        f"{REASONING_PAT}Assuming the retrieved documents contain up to date customer "
        f"acquisition information including a list of customers, the query can be answered. "
        f"It is important to note that if the information only exists in a database, "
        f"the system is unable to execute SQL and won't find an answer."
        f"\n{ANSWERABLE_PAT}True"
    )

    messages = [
        {
            "role": "user",
            "content": "You are a helper tool to determine if a query is answerable using retrieval augmented "
            f"generation.\nThe main system will try to answer the user query based on ONLY the top 5 most relevant "
            f"documents found from search.\nSources contain both up to date and proprietary information for "
            f"the specific team.\nFor named or unknown entities, assume the search will find "
            f"relevant and consistent knowledge about the entity.\n"
            f"The system is not tuned for writing code.\n"
            f"The system is not tuned for interfacing with structured data via query languages like SQL.\n"
            f"If the question might not require code or query language, "
            f"then assume it can be answered without code or query language.\n"
            f"Determine if that system should attempt to answer.\n"
            f'"{ANSWERABLE_PAT}" must be exactly "True" or "False"\n{GENERAL_SEP_PAT}\n'
            f"{ambiguous_example_question}{CODE_BLOCK_PAT.format(ambiguous_example_answer)}\n"
            f"{debug_example_question}{CODE_BLOCK_PAT.format(debug_example_answer)}\n"
            f"{up_to_date_example_question}{CODE_BLOCK_PAT.format(up_to_date_example_answer)}\n"
            f"{QUERY_PAT + user_query}",
        },
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
            reason_ind = model_output.find(REASONING_PAT)
            remaining = model_output[reason_ind + len(REASONING_PAT) :]
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
