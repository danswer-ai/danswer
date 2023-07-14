import json

from danswer.chunking.models import InferenceChunk
from danswer.configs.constants import DocumentSource
from danswer.connectors.factory import identify_connector_class


GENERAL_SEP_PAT = "---\n"
DOC_SEP_PAT = "---NEW DOCUMENT---"
DOC_CONTENT_START_PAT = "DOCUMENT CONTENTS:\n"
QUESTION_PAT = "Query:"
ANSWER_PAT = "Answer:"
UNCERTAINTY_PAT = "?"
QUOTE_PAT = "Quote:"

BASE_PROMPT = (
    f"Answer the query based on provided documents and quote relevant sections. "
    f"Respond with a json containing a concise answer and up to three most relevant quotes from the documents. "
    f"The quotes must be EXACT substrings from the documents."
)


SAMPLE_QUESTION = "Where is the Eiffel Tower?"

SAMPLE_JSON_RESPONSE = {
    "answer": "The Eiffel Tower is located in Paris, France.",
    "quotes": [
        "The Eiffel Tower is an iconic symbol of Paris",
        "located on the Champ de Mars in France.",
    ],
}


def add_metadata_section(
    prompt_current: str,
    chunk: InferenceChunk,
    prepend_tab: bool = False,
    include_sep: bool = False,
) -> str:
    """
    Inserts a metadata section at the start of a document, providing additional context to the upcoming document.

    Parameters:
    prompt_current (str): The existing content of the prompt so far with.
    chunk (InferenceChunk): An object that contains the document's source type and metadata information to be added.
    prepend_tab (bool, optional): If set to True, a tab character is added at the start of each line in the metadata
            section for consistent spacing for LLM.
    include_sep (bool, optional): If set to True, includes default section separator pattern at the end of the metadata
            section.

    Returns:
    str: The prompt with the newly added metadata section.
    """

    def _prepend(s: str, ppt: bool) -> str:
        return "\t" + s if ppt else s

    prompt_current += _prepend(f"DOCUMENT SOURCE: {chunk.source_type}\n", prepend_tab)
    if chunk.metadata:
        prompt_current += _prepend(f"METADATA:\n", prepend_tab)
        connector_class = identify_connector_class(DocumentSource(chunk.source_type))
        for metadata_line in connector_class.parse_metadata(chunk.metadata):
            prompt_current += _prepend(f"\t{metadata_line}\n", prepend_tab)
    prompt_current += _prepend(DOC_CONTENT_START_PAT, prepend_tab)
    if include_sep:
        prompt_current += GENERAL_SEP_PAT
    return prompt_current


def json_processor(
    question: str,
    chunks: list[InferenceChunk],
    include_metadata: bool = False,
    include_sep: bool = True,
) -> str:
    prompt = (
        BASE_PROMPT + f"Sample response:\n{json.dumps(SAMPLE_JSON_RESPONSE)}\n\n"
        f'Each context document below is prefixed with "{DOC_SEP_PAT}".\n\n'
    )

    for chunk in chunks:
        prompt += f"\n\n{DOC_SEP_PAT}\n"
        if include_metadata:
            prompt = add_metadata_section(
                prompt, chunk, prepend_tab=False, include_sep=include_sep
            )

        prompt += chunk.content

    prompt += "\n\n---\n\n"
    prompt += f"{QUESTION_PAT}\n{question}\n"
    return prompt


def json_chat_processor(
    question: str,
    chunks: list[InferenceChunk],
    include_metadata: bool = False,
    include_sep: bool = False,
) -> list[dict[str, str]]:
    metadata_prompt_section = "with metadata and contents " if include_metadata else ""
    intro_msg = (
        f"You are a Question Answering assistant that answers queries based on the provided most relevant documents.\n"
        f'Start by reading the following documents {metadata_prompt_section}and responding with "Acknowledged".'
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
        "If the query requires aggregating the number of documents, respond with "
        '{"answer": "Aggregations not supported", "quotes": []}\n'
        f"Sample response:\n{json.dumps(SAMPLE_JSON_RESPONSE)}"
    )
    messages = [{"role": "system", "content": intro_msg}]

    for chunk in chunks:
        full_context = ""
        if include_metadata:
            full_context = add_metadata_section(
                full_context, chunk, prepend_tab=False, include_sep=include_sep
            )
        full_context += chunk.content
        messages.extend(
            [
                {
                    "role": "user",
                    "content": full_context,
                },
                {"role": "assistant", "content": "Acknowledged"},
            ]
        )
    messages.append({"role": "system", "content": task_msg})

    messages.append({"role": "user", "content": f"{QUESTION_PAT}\n{question}\n"})

    return messages


# EVERYTHING BELOW IS DEPRECATED, kept around as reference, may use again in future


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
