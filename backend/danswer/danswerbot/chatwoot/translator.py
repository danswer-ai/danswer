import time
import uuid
import tiktoken
import hashlib


def generate_system_fingerprint():
    """Generate unique system_fingerprint."""
    # Generate a unique ID
    unique_id = uuid.uuid4().hex

    # Create a SHA-256 hash
    hash_object = hashlib.sha256(unique_id.encode())

    # Use the first 12 characters for the fingerprint
    system_fingerprint = hash_object.hexdigest()[:12]

    return f"fp_{system_fingerprint}"


def count_tokens(text, tokenizer: str = 'cl100k_base'):
    """Count the number of tokens in the text based on the tokenizer."""
    encoding = tiktoken.get_encoding(tokenizer)
    tokens = encoding.encode(text)
    return len(tokens)


def translate_danswer_to_openai(danswer_resp, model: str = 'gpt-3.5-turbo'):
    """Translate danswer API response to openai API response."""
    # Generate a unique ID and timestamp for the OpenAI response
    response_id = f"chatcmpl-{uuid.uuid4()}"
    created_timestamp = int(time.time())

    full_answer = (
        danswer_resp["answer"] + '\n' + danswer_resp["answer_citationless"]
    )

    prompt_tokens = 0   # How to pass value of the prompt
    completion_tokens = count_tokens(full_answer)
    total_tokens = prompt_tokens + completion_tokens

    openai_response = {
        "id": response_id,
        "object": "chat.completion",
        "created": created_timestamp,
        "model": model,
        "system_fingerprint": "fp_44709d6fcb",  # Is it constant?
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
