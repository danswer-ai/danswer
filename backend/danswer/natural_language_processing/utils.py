import gc
import os
from copy import copy
from typing import Any

import tiktoken
from tiktoken.core import Encoding
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


class Tokenizer:
    def __init__(
        self,
        model_name: str | None = None,
        provider_type: str | None = None,
    ):
        self.model_name: str | None = model_name
        self.provider_type: str | None = provider_type
        if provider_type:
            if provider_type.lower() == "OpenAI".lower():
                self.encoder: Any = tiktoken.get_encoding("cl100k_base")
            else:
                # Currently only supports OpenAI encoder
                raise ValueError("Invalid Encoder Provider selected")
        elif model_name:
            # NOTE: doing a local import here to avoid reduce memory usage caused by
            # processes importing this file despite not using any of this
            from transformers import AutoTokenizer  # type: ignore

            self.encoder = AutoTokenizer.from_pretrained(model_name)
            if hasattr(self.encoder, "is_fast") and self.encoder.is_fast:
                os.environ["TOKENIZERS_PARALLELISM"] = "false"
        else:
            raise ValueError("Need to provide a model_name or provider_type")

    def encode(self, string: str) -> list[int]:
        if isinstance(self.encoder, Encoding):
            return self.encoder.encode(string)
        try:
            return self.encoder.tokenize(string)
        except Exception as e:
            raise ValueError(f"Unsupported encoder type: {type(self.encoder)}") from e

    def decode(self, string: list[int]) -> str:
        if isinstance(self.encoder, Encoding):
            return self.encoder.decode(string)
        try:
            return self.encoder.tokenize(string)
        except Exception as e:
            raise ValueError(
                f"Unsupported decoder call on encoder type: {type(self.encoder)}"
            ) from e


_TOKENIZER: Tokenizer | None = None
_LLM_TOKENIZER: Tokenizer | None = None


# NOTE: If no model_name is specified, it may not be using the "correct" tokenizer
# for cases where this is more important, be sure to refresh with the actual model name
# One case where it is not particularly important is in the document chunking flow,
# they're basically all using the sentencepiece tokenizer and whether it's cased or
# uncased does not really matter, they'll all generally end up with the same chunk lengths.
def get_default_tokenizer(
    model_name: str = DOCUMENT_ENCODER_MODEL, provider_type: str | None = None
) -> Tokenizer:
    global _TOKENIZER

    if _TOKENIZER is None:
        _TOKENIZER = Tokenizer(model_name, provider_type)
    else:
        model_is_diff = _TOKENIZER.model_name != model_name
        provider_is_diff = _TOKENIZER.provider_type != provider_type
        if model_is_diff or provider_is_diff:
            del _TOKENIZER
            gc.collect()
            _TOKENIZER = Tokenizer(model_name, provider_type)

    return _TOKENIZER


def get_default_llm_tokenizer(provider_type: str = "OpenAI") -> Tokenizer:
    """Currently only supports the OpenAI default tokenizer: tiktoken"""
    global _LLM_TOKENIZER
    if _LLM_TOKENIZER is None:
        _LLM_TOKENIZER = Tokenizer(provider_type=provider_type)
    return _LLM_TOKENIZER


def tokenizer_trim_content(
    content: str, desired_length: int, tokenizer: Tokenizer
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
