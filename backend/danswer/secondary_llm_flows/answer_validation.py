from danswer.configs.constants import ANSWER_PAT
from danswer.configs.constants import CODE_BLOCK_PAT
from danswer.configs.constants import QUESTION_PAT
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
        # Below COT block is unused, keeping for reference. Chain of Thought here significantly increases the time to
        # answer, we can get most of the way there but just having the model evaluate each individual condition with
        # a single True/False.
        # cot_block = (
        #    f"{THOUGHT_PAT} Use this as a scratchpad to write out in a step by step manner your reasoning "
        #    f"about EACH criterion to ensure that your conclusion is correct. "
        #    f"Be brief when evaluating each condition.\n"
        #    f"{FINAL_ANSWER_PAT} Valid or Invalid"
        # )

        format_demo = (
            "1. True or False\n"
            "2. True or False\n"
            "3. True or False\n"
            "Final Answer: Valid or Invalid"
        )

        messages = [
            {
                "role": "user",
                "content": (
                    "You are an assistant to identify invalid query/answer pairs coming from a large language model. "
                    "The query/answer pair is invalid if any of the following are True:\n"
                    "1. Query is asking for information that varies by person or is subjective."
                    "If there is not a globally true answer, the language model should not respond, "
                    "therefore any answer is invalid.\n"
                    "2. Answer addresses a related but different query. Sometimes to be helpful, the model will "
                    "provide related information about a query but it won't match what the user is asking, "
                    "this is invalid.\n"
                    '3. Answer is just some form of "I don\'t know" or "not enough information" without significant '
                    "additional useful information. Explaining why it does not know or cannot answer is invalid.\n\n"
                    f"{QUESTION_PAT} {query}\n{ANSWER_PAT} {answer}"
                    "\n\n------------------------\n"
                    f"You MUST answer in EXACTLY the following format:{CODE_BLOCK_PAT.format(format_demo)}\n"
                    "Hint: Remember, if ANY of the conditions are True, it is Invalid."
                ),
            },
        ]

        return messages

    def _extract_validity(model_output: str) -> bool:
        if model_output.strip().strip("```").strip().split()[-1].lower() == "invalid":
            return False
        return True  # If something is wrong, let's not toss away the answer

    messages = _get_answer_validation_messages(query, answer)
    filled_llm_prompt = dict_based_prompt_to_langchain_prompt(messages)
    model_output = get_default_llm().invoke(filled_llm_prompt)
    logger.debug(model_output)

    validity = _extract_validity(model_output)

    return validity
