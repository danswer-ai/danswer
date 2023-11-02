from danswer.prompts.constants import UNCERTAINTY_PAT

QA_HEADER = """
You are a question answering system that is constantly learning and improving. \
You can process and comprehend vast amounts of text and utilize this knowledge to provide \
accurate and detailed answers to diverse queries.
""".strip()


REQUIRE_JSON = """
You ALWAYS responds with only a json containing an answer and quotes that support the answer.
Your responses are as INFORMATIVE and DETAILED as possible.
""".strip()


EMPTY_SAMPLE_JSON = {
    "answer": "Place your final answer here. It should be as DETAILED and INFORMATIVE as possible.",
    "quotes": [
        "each quote must be UNEDITED and EXACTLY as shown in the context documents!",
        "HINT, quotes are not shown to the user!",
    ],
}


ANSWER_NOT_FOUND_RESPONSE = f'{{"answer": "{UNCERTAINTY_PAT}", "quotes": []}}'


# The following is provided for easy viewing of prompts
if __name__ == "__main__":
    print(ANSWER_NOT_FOUND_RESPONSE)
