import abc
import json

from danswer.chunking.models import InferenceChunk
from danswer.configs.constants import ANSWER_PAT
from danswer.configs.constants import DOC_CONTENT_START_PAT
from danswer.configs.constants import DOC_SEP_PAT
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import GENERAL_SEP_PAT
from danswer.configs.constants import QUESTION_PAT
from danswer.configs.constants import QUOTE_PAT
from danswer.configs.constants import UNCERTAINTY_PAT
from danswer.connectors.factory import identify_connector_class


BASE_PROMPT = (
    "Answer the query based on provided documents and quote relevant sections. "
    "Respond with a json containing a concise answer and up to three most relevant quotes from the documents. "
    'Respond with "?" for the answer if the query cannot be answered based on the documents. '
    "The quotes must be EXACT substrings from the documents."
)

EMPTY_SAMPLE_JSON = {
    "answer": "Place your final answer here. It should be as DETAILED and INFORMATIVE as possible.",
    "quotes": [
        "each quote must be UNEDITED and EXACTLY as shown in the context documents!",
        "HINT, quotes are not shown to the user!",
    ],
}


def _append_acknowledge_doc_messages(
    current_messages: list[dict[str, str]], new_chunk_content: str
) -> list[dict[str, str]]:
    updated_messages = current_messages.copy()
    updated_messages.extend(
        [
            {
                "role": "user",
                "content": new_chunk_content,
            },
            {"role": "assistant", "content": "Acknowledged"},
        ]
    )
    return updated_messages


def _add_metadata_section(
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
        prompt_current += _prepend("METADATA:\n", prepend_tab)
        connector_class = identify_connector_class(DocumentSource(chunk.source_type))
        for metadata_line in connector_class.parse_metadata(chunk.metadata):
            prompt_current += _prepend(f"\t{metadata_line}\n", prepend_tab)
    prompt_current += _prepend(DOC_CONTENT_START_PAT, prepend_tab)
    if include_sep:
        prompt_current += GENERAL_SEP_PAT
    return prompt_current


class PromptProcessor(abc.ABC):
    """Take the most relevant chunks and fills out a LLM prompt using the chunk contents
    and optionally metadata about the chunk"""

    @property
    @abc.abstractmethod
    def specifies_json_output(self) -> bool:
        raise NotImplementedError

    @staticmethod
    @abc.abstractmethod
    def fill_prompt(
        question: str, chunks: list[InferenceChunk], include_metadata: bool = False
    ) -> str | list[dict[str, str]]:
        raise NotImplementedError


class NonChatPromptProcessor(PromptProcessor):
    @staticmethod
    @abc.abstractmethod
    def fill_prompt(
        question: str, chunks: list[InferenceChunk], include_metadata: bool = False
    ) -> str:
        raise NotImplementedError


class ChatPromptProcessor(PromptProcessor):
    @staticmethod
    @abc.abstractmethod
    def fill_prompt(
        question: str, chunks: list[InferenceChunk], include_metadata: bool = False
    ) -> list[dict[str, str]]:
        raise NotImplementedError


class JsonProcessor(NonChatPromptProcessor):
    @property
    def specifies_json_output(self) -> bool:
        return True

    @staticmethod
    def fill_prompt(
        question: str, chunks: list[InferenceChunk], include_metadata: bool = False
    ) -> str:
        prompt = (
            BASE_PROMPT + f" Sample response:\n{json.dumps(EMPTY_SAMPLE_JSON)}\n\n"
            f'Each context document below is prefixed with "{DOC_SEP_PAT}".\n\n'
        )

        for chunk in chunks:
            prompt += f"\n\n{DOC_SEP_PAT}\n"
            if include_metadata:
                prompt = _add_metadata_section(
                    prompt, chunk, prepend_tab=False, include_sep=True
                )

            prompt += chunk.content

        prompt += "\n\n---\n\n"
        prompt += f"{QUESTION_PAT}\n{question}\n"
        return prompt


class JsonChatProcessor(ChatPromptProcessor):
    @property
    def specifies_json_output(self) -> bool:
        return True

    @staticmethod
    def fill_prompt(
        question: str,
        chunks: list[InferenceChunk],
        include_metadata: bool = False,
    ) -> list[dict[str, str]]:
        metadata_prompt_section = (
            "with metadata and contents " if include_metadata else ""
        )
        intro_msg = (
            f"You are a Question Answering assistant that answers queries "
            f"based on the provided most relevant documents.\n"
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
            f"Sample response:\n{json.dumps(EMPTY_SAMPLE_JSON)}"
        )
        messages = [{"role": "system", "content": intro_msg}]
        for chunk in chunks:
            full_context = ""
            if include_metadata:
                full_context = _add_metadata_section(
                    full_context, chunk, prepend_tab=False, include_sep=False
                )
            full_context += chunk.content
            messages = _append_acknowledge_doc_messages(messages, full_context)
        messages.append({"role": "system", "content": task_msg})

        messages.append({"role": "user", "content": f"{QUESTION_PAT}\n{question}\n"})

        return messages


class WeakModelFreeformProcessor(NonChatPromptProcessor):
    """Avoid using this one if the model is capable of using another prompt
    Intended for models that can't follow complex instructions or have short context windows
    This prompt only uses 1 reference document chunk
    """

    @property
    def specifies_json_output(self) -> bool:
        return False

    @staticmethod
    def fill_prompt(
        question: str, chunks: list[InferenceChunk], include_metadata: bool = False
    ) -> str:
        first_chunk_content = chunks[0].content if chunks else "No Document Provided"

        prompt = (
            f"Reference Document:\n{first_chunk_content}\n{GENERAL_SEP_PAT}"
            f"Answer the user query below based on the reference document above. "
            f'Respond with an "{ANSWER_PAT}" section and '
            f'as many "{QUOTE_PAT}" sections as needed to support the answer.'
            f"\n{GENERAL_SEP_PAT}"
            f"{QUESTION_PAT} {question}\n"
            f"{ANSWER_PAT}"
        )

        return prompt


class WeakChatModelFreeformProcessor(ChatPromptProcessor):
    """Avoid using this one if the model is capable of using another prompt
    Intended for models that can't follow complex instructions or have short context windows
    This prompt only uses 1 reference document chunk
    """

    @property
    def specifies_json_output(self) -> bool:
        return False

    @staticmethod
    def fill_prompt(
        question: str, chunks: list[InferenceChunk], include_metadata: bool = False
    ) -> list[dict[str, str]]:
        first_chunk_content = chunks[0].content if chunks else "No Document Provided"
        intro_msg = (
            f"You are a question answering assistant. "
            f'Respond to the query with an "{ANSWER_PAT}" section and '
            f'as many "{QUOTE_PAT}" sections as needed to support the answer. '
            f"Answer the user query based on the following document:\n\n{first_chunk_content}"
        )

        messages = [{"role": "system", "content": intro_msg}]

        user_query = f"{QUESTION_PAT} {question}"
        messages.append({"role": "user", "content": user_query})

        return messages


# EVERYTHING BELOW IS DEPRECATED, kept around as reference, may revisit in future


class FreeformProcessor(NonChatPromptProcessor):
    @property
    def specifies_json_output(self) -> bool:
        return False

    @staticmethod
    def fill_prompt(
        question: str, chunks: list[InferenceChunk], include_metadata: bool = False
    ) -> str:
        prompt = (
            f"Answer the query based on the documents below and quote the documents segments containing the answer. "
            f'Respond with one "{ANSWER_PAT}" section and as many "{QUOTE_PAT}" sections as is relevant. '
            f'Start each quote with "{QUOTE_PAT}". Each quote should be a single continuous segment from a document. '
            f'If the query cannot be answered based on the documents, say "{UNCERTAINTY_PAT}". '
            f'Each document is prefixed with "{DOC_SEP_PAT}".\n\n'
        )

        for chunk in chunks:
            prompt += f"\n{DOC_SEP_PAT}\n{chunk.content}"

        prompt += "\n\n---\n\n"
        prompt += f"{QUESTION_PAT}\n{question}\n"
        prompt += f"{ANSWER_PAT}\n"
        return prompt
