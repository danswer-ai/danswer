import time
import uuid
import tiktoken
import hashlib
from typing import Dict, Any, Tuple


def extract_prompt(
    openai_request: Dict[str, Any],
    tokenizer: str = 'cl100k_base'
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
        msg['content']
        for msg in openai_request['messages'] if msg['role'] == 'user'
    ]
    if not user_messages:
        raise ValueError("No user messages found in the OpenAI request.")

    prompt = user_messages[-1]
    prompt_tokens = len(tokenizer.encode(prompt))
    prompt_tokens = count_tokens(prompt)

    return prompt, prompt_tokens

def generate_system_fingerprint() -> str:
    """Generate unique system_fingerprint."""
    # Generate a unique ID
    unique_id = uuid.uuid4().hex

    # Create a SHA-256 hash
    hash_object = hashlib.sha256(unique_id.encode())

    # Use the first 12 characters for the fingerprint
    system_fingerprint = hash_object.hexdigest()[:12]

    return f"fp_{system_fingerprint}"


def count_tokens(text: str, tokenizer: str = 'cl100k_base') -> int:
    """Count the number of tokens in the text based on the tokenizer."""
    # Availble tokenizers
    # https://github.com/openai/tiktoken/blob/main/tiktoken_ext/openai_public.py
    encoding = tiktoken.get_encoding(tokenizer)
    tokens = encoding.encode(text)
    return len(tokens)


def translate_danswer_to_openai(
    danswer_resp: dict,
    model: str = 'gpt-3.5-turbo',
    prompt_tokens: int = 0
) -> dict:
    """Translate danswer API response to openai API response."""

    # Generate a unique ID and timestamp for the OpenAI response
    response_id = f"chatcmpl-{uuid.uuid4()}"
    created_timestamp = int(time.time())

    full_answer = (
        danswer_resp["answer"] + '\n' + danswer_resp["answer_citationless"]
    )

    system_fingerprint = generate_system_fingerprint()

    prompt_tokens = prompt_tokens
    completion_tokens = count_tokens(full_answer)
    total_tokens = prompt_tokens + completion_tokens

    openai_response = {
        "id": response_id,
        "object": "chat.completion",
        "created": created_timestamp,
        "model": model,
        "system_fingerprint": system_fingerprint,
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": full_answer,
            },
            "logprobs": None,
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
        }
    }
    return openai_response
