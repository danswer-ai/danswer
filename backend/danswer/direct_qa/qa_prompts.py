import json

DOC_SEP_PAT = "---NEW DOCUMENT---"
QUESTION_PAT = "Query:"
ANSWER_PAT = "Answer:"
UNCERTAINTY_PAT = "?"
QUOTE_PAT = "Quote:"

BASE_PROMPT = (
    f"Answer the query based on provided documents and quote relevant sections. "
    f"Respond with a json containing a concise answer and up to three most relevant quotes from the documents. "
    f"The quotes must be EXACT substrings from the documents.\n"
)


SAMPLE_QUESTION = "Where is the Eiffel Tower?"

SAMPLE_JSON_RESPONSE = {
    "answer": "The Eiffel Tower is located in Paris, France.",
    "quotes": [
        "The Eiffel Tower is an iconic symbol of Paris",
        "located on the Champ de Mars in France.",
    ],
}


def json_processor(question: str, documents: list[str]) -> str:
    prompt = (
        BASE_PROMPT + f"Sample response:\n{json.dumps(SAMPLE_JSON_RESPONSE)}\n\n"
        f'Each context document below is prefixed with "{DOC_SEP_PAT}".\n\n'
    )

    for document in documents:
        prompt += f"\n{DOC_SEP_PAT}\n{document}"

    prompt += "\n\n---\n\n"
    prompt += f"{QUESTION_PAT}\n{question}\n"
    return prompt


# Chain of Thought approach works however has higher token cost (more expensive) and is slower.
# Should use this one if users ask questions that require logical reasoning.
def json_cot_variant_processor(question: str, documents: list[str]) -> str:
    prompt = (
        f"Answer the query based on provided documents and quote relevant sections. "
        f'Respond with a freeform reasoning section followed by "Final Answer:" with a '
        f"json containing a concise answer to the query and up to three most relevant quotes from the documents.\n"
        f"Sample answer json:\n{json.dumps(SAMPLE_JSON_RESPONSE)}\n\n"
        f'Each context document below is prefixed with "{DOC_SEP_PAT}".\n\n'
    )

    for document in documents:
        prompt += f"\n{DOC_SEP_PAT}\n{document}"

    prompt += "\n\n---\n\n"
    prompt += f"{QUESTION_PAT}\n{question}\n"
    prompt += "Reasoning:\n"
    return prompt


# This one seems largely useless with a single example
# Model seems to take the one example of answering Yes and just does that too.
def json_reflexion_processor(question: str, documents: list[str]) -> str:
    reflexion_str = "Does this fully answer the user query?"
    prompt = (
        BASE_PROMPT
        + f'After each generated json, ask "{reflexion_str}" and respond Yes or No. '
        f"If No, generate a better json response to the query.\n"
        f"Sample question and response:\n"
        f"{QUESTION_PAT}\n{SAMPLE_QUESTION}\n"
        f"{json.dumps(SAMPLE_JSON_RESPONSE)}\n"
        f"{reflexion_str} Yes\n\n"
        f'Each context document below is prefixed with "{DOC_SEP_PAT}".\n\n'
    )

    for document in documents:
        prompt += f"\n---NEW CONTEXT DOCUMENT---\n{document}"

    prompt += "\n\n---\n\n"
    prompt += f"{QUESTION_PAT}\n{question}\n"
    return prompt


# Initial design, works pretty well but not optimal
def freeform_processor(question: str, documents: list[str]) -> str:
    prompt = (
        f"Answer the query based on the documents below and quote the documents segments containing the answer. "
        f'Respond with one "{ANSWER_PAT}" section and as many "{QUOTE_PAT}" sections as is relevant. '
        f'Start each quote with "{QUOTE_PAT}". Each quote should be a single continuous segment from a document. '
        f'If the query cannot be answered based on the documents, say "{UNCERTAINTY_PAT}". '
        f'Each document is prefixed with "{DOC_SEP_PAT}".\n\n'
    )

    for document in documents:
        prompt += f"\n{DOC_SEP_PAT}\n{document}"

    prompt += "\n\n---\n\n"
    prompt += f"{QUESTION_PAT}\n{question}\n"
    prompt += f"{ANSWER_PAT}\n"
    return prompt


def json_chat_processor(question: str, documents: list[str]) -> list[dict[str, str]]:
    intro_msg = (
        "You are a Question Answering assistant that answers queries based on provided documents.\n"
        'Start by reading the following documents and responding with "Acknowledged".'
    )

    complete_answer_not_found_response = (
        '{"answer": "' + UNCERTAINTY_PAT + '", "quotes": []}'
    )
    task_msg = (
        "Now answer the next user query based on documents above and quote relevant sections.\n"
        "Respond with a JSON containing the answer and up to three most relevant quotes from the documents.\n"
        "All quotes MUST be EXACT substrings from provided documents.\n"
        "Your responses should be informative and concise.\n"
        "You MUST prioritize information from provided documents over internal knowledge.\n"
        "If the query cannot be answered based on the documents, respond with "
        f"{complete_answer_not_found_response}\n"
        "If the query requires aggregating whole documents, respond with "
        '{"answer": "Aggregations not supported", "quotes": []}\n'
        f"Sample response:\n{json.dumps(SAMPLE_JSON_RESPONSE)}"
    )
    messages = [{"role": "system", "content": intro_msg}]

    for document in documents:
        messages.extend(
            [
                {
                    "role": "user",
                    "content": document,
                },
                {"role": "assistant", "content": "Acknowledged"},
            ]
        )
    messages.append({"role": "system", "content": task_msg})

    messages.append({"role": "user", "content": f"{QUESTION_PAT}\n{question}\n"})

    return messages


def freeform_chat_processor(
    question: str, documents: list[str]
) -> list[dict[str, str]]:
    sample_quote = "Quote:\nThe hotdogs are freshly cooked.\n\nQuote:\nThey are very cheap at only a dollar each."
    role_msg = (
        f"You are a Question Answering assistant that answers queries based on provided documents. "
        f'You will be asked to acknowledge a set of documents and then provide one "{ANSWER_PAT}" and '
        f'as many "{QUOTE_PAT}" sections as is relevant to back up your answer. '
        f"Answer the question directly and concisely. "
        f"Each quote should be a single continuous segment from a document. "
        f'If the query cannot be answered based on the documents, say "{UNCERTAINTY_PAT}". '
        f"An example of quote sections may look like:\n{sample_quote}"
    )

    messages = [
        {"role": "system", "content": role_msg},
    ]
    for document in documents:
        messages.extend(
            [
                {
                    "role": "user",
                    "content": f"Acknowledge the following document:\n{document}",
                },
                {"role": "assistant", "content": "Acknowledged"},
            ]
        )

    messages.append(
        {
            "role": "user",
            "content": f"Please now answer the following query based on the previously provided "
            f"documents and quote the relevant sections of the documents\n{question}",
        },
    )

    return messages


# Not very useful, have not seen it improve an answer based on this
# Sometimes gpt-3.5-turbo will just answer something worse like:
# 'The response is a valid json that fully answers the user query with quotes exactly matching sections of the source
# document. No revision is needed.'
def get_chat_reflexion_msg() -> dict[str, str]:
    reflexion_content = (
        "Is the assistant response a valid json that fully answer the user query? "
        "If the response needs to be fixed or if an improvement is possible, provide a revised json. "
        "Otherwise, respond with the same json."
    )
    return {"role": "system", "content": reflexion_content}
