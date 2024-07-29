import hashlib
import time
import uuid
from typing import Any
from typing import Dict
from typing import List
from typing import Optional
from typing import Tuple

import tiktoken
from pydantic import BaseModel
from pydantic import HttpUrl


class Document(
    BaseModel
):  # can do from prompt_toolkit.document import Document instead
    document_id: str
    chunk_ind: int
    semantic_identifier: str
    link: HttpUrl
    blurb: str
    source_type: str
    boost: float
    hidden: bool
    metadata: dict
    score: float
    match_highlights: List[str]
    updated_at: str
    primary_owners: Optional[str] = None
    secondary_owners: Optional[str] = None
    db_doc_id: int


class ContextDocs(BaseModel):
    top_documents: List[Document] = []


class Message(BaseModel):
    message_id: int
    parent_message: int
    latest_child_message: Optional[int] = None
    message: str
    rephrased_query: Optional[str] = None
    context_docs: Optional[ContextDocs] = None
    citations: Optional[dict[str, int]] = None


def extract_last_user_query(
    openai_request: Dict[str, Any],
) -> Tuple[str, int]:
    """
    Extracts the prompt from an OpenAI request and counts the number of tokens.

    Args:
        openai_request (Dict[str, Any]): The OpenAI request JSON as a dictionary.

    Returns:
        Tuple[str, int]: A tuple containing the prompt string and the number of tokens.
    """
    # Find the last user message
    user_messages = [
        msg["content"] for msg in openai_request["messages"] if msg["role"] == "user"
    ]
    if not user_messages:
        raise ValueError("No user messages found in the OpenAI request.")

    prompt = user_messages[-1]
    prompt_tokens_count = count_tokens(prompt)

    return prompt, prompt_tokens_count


def generate_system_fingerprint() -> str:
    """Generate unique system_fingerprint."""
    # Generate a unique ID
    # print(uuid.uuid4())
    unique_id = uuid.uuid4().hex

    # Create a SHA-256 hash
    hash_object = hashlib.sha256(unique_id.encode())

    # Use the first 12 characters for the fingerprint
    system_fingerprint = hash_object.hexdigest()[:12]

    return f"fp_{system_fingerprint}"


def count_tokens(text: str, tokenizer: str = "cl100k_base") -> int:
    """Count the number of tokens in the text based on the tokenizer."""
    # Availble tokenizers
    # https://github.com/openai/tiktoken/blob/main/tiktoken_ext/openai_public.py
    encoding = tiktoken.get_encoding(tokenizer)
    tokens = encoding.encode(text)
    return len(tokens)


def translate_danswer_to_openai(
    danswer_resp: Message, model: str = "gpt-3.5-turbo", prormpt_token_count: int = 0
) -> dict:
    """Translate danswer API response to openai API response."""

    # Generate a unique ID and timestamp for the OpenAI response
    response_id = f"chatcmpl-{uuid.uuid4()}"
    created_timestamp = int(time.time())
    full_answer = danswer_resp.message
    if (
        danswer_resp.citations
        and danswer_resp.context_docs
        and danswer_resp.context_docs.top_documents
    ):
        db_id_to_citation_str_rep = {v: k for k, v in danswer_resp.citations.items()}
        for document in danswer_resp.context_docs.top_documents:
            if document.db_doc_id in db_id_to_citation_str_rep:
                citation_str_rep = db_id_to_citation_str_rep.pop(document.db_doc_id)
                formatted_line_for_citation = f"[[{citation_str_rep}]{document.semantic_identifier}]({document.link})"
                full_answer += f"\n{formatted_line_for_citation}"
    system_fingerprint = generate_system_fingerprint()

    prormpt_token_count = prormpt_token_count
    completion_tokens = count_tokens(full_answer)
    total_tokens = prormpt_token_count + completion_tokens

    openai_response = {
        "id": response_id,
        "object": "chat.completion",
        "created": created_timestamp,
        "model": model,
        "system_fingerprint": system_fingerprint,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": full_answer,
                },
                "logprobs": None,
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": prormpt_token_count,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
        },
    }
    return openai_response
