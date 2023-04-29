DOC_SEP_PAT = "---NEW DOCUMENT---"
QUESTION_PAT = "Query:"
ANSWER_PAT = "Answer:"
UNCERTAINTY_PAT = "?"
QUOTE_PAT = "Quote:"


def generic_prompt_processor(question: str, documents: list[str]) -> str:
    prompt = (
        f"Answer the query based on the documents below and quote the documents sections containing "
        f'the answer. Respond with one "{ANSWER_PAT}" section and one or more "{QUOTE_PAT}" sections. '
        f"For each quote, only include text exactly from the documents, don't include the source. "
        f'If the query cannot be answered based on the documents, say "{UNCERTAINTY_PAT}". '
        f'Each document is prefixed with "{DOC_SEP_PAT}".\n\n'
    )

    for document in documents:
        prompt += f"\n{DOC_SEP_PAT}\n{document}"

    prompt += "\n\n---\n\n"
    prompt += f"{QUESTION_PAT}\n{question}\n"
    prompt += f"{ANSWER_PAT}\n"
    return prompt


BASIC_QA_PROMPTS = {
    "generic-qa": generic_prompt_processor,
}
