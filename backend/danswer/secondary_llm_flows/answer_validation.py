from danswer.configs.constants import ANSWER_PAT
from danswer.configs.constants import CODE_BLOCK_PAT
from danswer.configs.constants import FINAL_ANSWER_PAT
from danswer.configs.constants import GENERAL_SEP_PAT
from danswer.configs.constants import QUESTION_PAT
from danswer.configs.constants import THOUGHT_PAT
from danswer.direct_qa.qa_block import dict_based_prompt_to_langchain_prompt
from danswer.llm.build import get_default_llm
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time

logger = setup_logger()


@log_function_time()
def get_answer_validity(
    query: str,
    answer: str,
) -> bool:
    def _get_answer_validation_messages(
        query: str, answer: str
    ) -> list[dict[str, str]]:
        cot_block = (
            f"{THOUGHT_PAT} Use this as a scratchpad to write out in a step by step manner your reasoning "
            f"about EACH criterion to ensure that your conclusion is correct. "
            f"Be brief when evaluating each condition.\n"
            f"{FINAL_ANSWER_PAT} Valid or Invalid"
        )

        q_a_block = f"{QUESTION_PAT} {query}\n\n{ANSWER_PAT} {answer}"

        messages = [
            {
                "role": "user",
                "content": (
                    f"{CODE_BLOCK_PAT.format(q_a_block).lstrip()}{GENERAL_SEP_PAT}\n"
                    "Determine if the answer is valid for the query.\n"
                    f"The answer is invalid if ANY of the following is true:\n"
                    "1. Does not directly answer the user query.\n"
                    "2. Answers a related but different question.\n"
                    "3. Query requires a subjective answer or an opinion.\n"
                    '4. Contains anything meaning "I don\'t know" or "information not found".\n\n'
                    f"You must use the following format:"
                    f"{CODE_BLOCK_PAT.format(cot_block)}"
                    f'Hint: Final Answer must be exactly "Valid" or "Invalid"'
                ),
            },
        ]

        return messages

    def _extract_validity(model_output: str) -> bool:
        if FINAL_ANSWER_PAT in model_output:
            result = model_output.split(FINAL_ANSWER_PAT)[-1].strip()
            if "invalid" in result.lower():
                return False
        return True  # If something is wrong, let's not toss away the answer

    messages = _get_answer_validation_messages(query, answer)
    filled_llm_prompt = dict_based_prompt_to_langchain_prompt(messages)
    model_output = get_default_llm().invoke(filled_llm_prompt)
    logger.debug(model_output)

    validity = _extract_validity(model_output)

    return validity
