DOC_SEP_PAT = "---NEW DOCUMENT---"
QUESTION_PAT = "Query:"
ANSWER_PAT = "Answer:"
UNCERTAINTY_PAT = "?"
QUOTE_PAT = "Quote:"


def generic_prompt_processor(question: str, documents: list[str]) -> str:
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


def openai_chat_completion_processor(
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
