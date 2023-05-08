import json

DOC_SEP_PAT = "---NEW DOCUMENT---"
QUESTION_PAT = "Query:"
ANSWER_PAT = "Answer:"
UNCERTAINTY_PAT = "?"
QUOTE_PAT = "Quote:"


def json_processor(question: str, documents: list[str]) -> str:
    sample_response = {
        "answer": "The Eiffel Tower is located in Paris, France.",
        "quotes": [
            "The Eiffel Tower is an iconic symbol of Paris",
            "located on the Champ de Mars in France.",
        ],
    }
    prompt = (
        f"Answer the query based on provided documents and quote relevant sections. "
        f"Respond with a json containing a concise answer and up to three most relevant quotes from the documents.\n"
        f"Sample response:\n{json.dumps(sample_response)}\n\n"
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
    sample_response = {
        "answer": "The Eiffel Tower is located in Paris, France.",
        "quotes": [
            "The Eiffel Tower is an iconic symbol of Paris",
            "located on the Champ de Mars in France.",
        ],
    }
    prompt = (
        f"Answer the query based on provided documents and quote relevant sections. "
        f'Respond with a freeform reasoning section followed by "Final Answer:" with a '
        f"json containing a concise answer to the query and up to three most relevant quotes from the documents.\n"
        f"Sample answer json:\n{json.dumps(sample_response)}\n\n"
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
    sample_response = {
        "answer": "The Eiffel Tower is located in Paris, France.",
        "quotes": [
            "The Eiffel Tower is an iconic symbol of Paris",
            "located on the Champ de Mars in France.",
        ],
    }
    prompt = (
        f"Answer the query based on provided documents and quote relevant sections. "
        f"Respond with a json containing a concise answer and up to three most relevant quotes from the documents.\n"
        f"After each generated json, ask {reflexion_str} and respond Yes or No. "
        f"If No, generate a better json response to the query.\n"
        f"Sample question and response:\n"
        f"{QUESTION_PAT}\nWhere is the Eiffel Tower?\n"
        f"{json.dumps(sample_response)}\n"
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
