import os
from copy import copy
from typing import Any

import tiktoken
from tiktoken.core import Encoding
from tokenizers import Tokenizer  # type:ignore
from transformers import logging as transformer_logging  # type:ignore

from danswer.configs.model_configs import DOC_EMBEDDING_CONTEXT_SIZE
from danswer.configs.model_configs import DOCUMENT_ENCODER_MODEL
from danswer.search.models import InferenceChunk
from danswer.utils.logger import setup_logger

logger = setup_logger()
transformer_logging.set_verbosity_error()
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"


def _set_encoder_from_provider(provider_type: str) -> Any:
    if provider_type.lower() == "OpenAI".lower():
        return tiktoken.get_encoding("cl100k_base")

    if provider_type.lower() == "Cohere".lower():
        return Tokenizer.from_pretrained("Cohere/command-nightly")

    logger.warning(
        f"Invalid Encoder Provider selected: {provider_type}\n"
        "Supported providers: OpenAI, Cohere\n"
        "Defaulting to OpenAI..."
    )
    return tiktoken.get_encoding("cl100k_base")


class UnifiedTokenizer:
    """
    This class provides a wrapper for the different tokenizers
    provided by different libraries to give a unified interface
    for tokenization.
    Right now, it supports the OpenAI and Cohere libraries.
    It also supports transformers models.
    If no provider_type is specified, it will use the
    tokenizer for the specified model_name.

    NOTE: local importing may be neccesary to prevent using too much memory
    """

    def __init__(
        self,
        model_name: str | None = None,
        provider_type: str | None = None,
    ):
        self.encoder: Any

        if provider_type:
            self.encoder = _set_encoder_from_provider(provider_type)
        elif model_name:
            self.encoder = Tokenizer.from_pretrained(model_name)
        else:
            raise ValueError("Need to provide a model_name or provider_type")

    def encode(self, string: str) -> list[int]:
        if isinstance(self.encoder, Encoding):
            return self.encoder.encode(string)

        if isinstance(self.encoder, Tokenizer):
            return self.encoder.encode(string)

        raise ValueError(f"Unsupported encoder type: {type(self.encoder)}\n")

    def decode(self, string: list[int]) -> str:
        if isinstance(self.encoder, Encoding):
            return self.encoder.decode(string)

        if isinstance(self.encoder, Tokenizer):
            return self.encoder.decode(string)

        raise ValueError(
            f"Unsupported decoder call on encoder type: {type(self.encoder)}\n"
        )


_TOKENIZER_CACHE: dict[tuple[str | None, str | None], UnifiedTokenizer] = {}


# NOTE: If no model_name is specified, it may not be using the "correct" tokenizer
# for cases where this is more important, be sure to refresh with the actual model name
# One case where it is not particularly important is in the document chunking flow,
# they're basically all using the sentencepiece tokenizer and whether it's cased or
# uncased does not really matter, they'll all generally end up with the same chunk lengths.
def get_default_tokenizer(
    model_name: str | None = None, provider_type: str | None = None
) -> UnifiedTokenizer:
    if provider_type is None and model_name is None:
        # Default to tokenizing with DOCUMENT_ENCODER_MODEL
        model_name = DOCUMENT_ENCODER_MODEL

    global _TOKENIZER_CACHE
    if not _TOKENIZER_CACHE.get((model_name, provider_type)):
        _TOKENIZER_CACHE[(model_name, provider_type)] = UnifiedTokenizer(
            model_name, provider_type
        )
    return _TOKENIZER_CACHE[(model_name, provider_type)]


def get_default_llm_tokenizer(provider_type: str = "OpenAI") -> UnifiedTokenizer:
    """Currently supports the OpenAI tokenizer: tiktoken by default"""
    return get_default_tokenizer(model_name=None, provider_type=provider_type)


def tokenizer_trim_content(
    content: str, desired_length: int, tokenizer: UnifiedTokenizer
) -> str:
    tokens = tokenizer.encode(content)
    if len(tokens) > desired_length:
        content = tokenizer.decode(tokens[:desired_length])
    return content


def tokenizer_trim_chunks(
    chunks: list[InferenceChunk], max_chunk_toks: int = DOC_EMBEDDING_CONTEXT_SIZE
) -> list[InferenceChunk]:
    tokenizer = get_default_llm_tokenizer()
    new_chunks = copy(chunks)
    for ind, chunk in enumerate(new_chunks):
        new_content = tokenizer_trim_content(chunk.content, max_chunk_toks, tokenizer)
        if len(new_content) != len(chunk.content):
            new_chunk = copy(chunk)
            new_chunk.content = new_content
            new_chunks[ind] = new_chunk
    return new_chunks
