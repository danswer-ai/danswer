import os

QUERY_EMBEDDING_CONTEXT_SIZE = 256
DOC_EMBEDDING_CONTEXT_SIZE = 512
CROSS_EMBED_CONTEXT_SIZE = 512
MODEL_CACHE_FOLDER = os.environ.get("TRANSFORMERS_CACHE")

# Purely an optimization, memory limitation consideration
BATCH_SIZE_ENCODE_CHUNKS = 8

# QA Model API Configs
# https://platform.openai.com/docs/models/model-endpoint-compatibility
INTERNAL_MODEL_VERSION = os.environ.get("INTERNAL_MODEL", "openai-completion")
OPENAPI_MODEL_VERSION = os.environ.get("OPENAI_MODEL_VERSION", "text-davinci-003")
OPENAI_MAX_OUTPUT_TOKENS = 512
