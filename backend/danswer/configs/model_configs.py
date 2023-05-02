import os

# Bi/Cross-Encoder Model Configs
# TODO: try 'all-distilroberta-v1' maybe larger training set has more technical knowledge (768 dim)
# Downside: slower by factor of 3 (model size)
# Important considerations, max tokens must be 512
DOCUMENT_ENCODER_MODEL = "multi-qa-MiniLM-L6-cos-v1"
DOC_EMBEDDING_DIM = 384  # Depends on the document encoder model

# L-12-v2 might be worth a try, though stats seem very very similar, L-12 slower by factor of 2
CROSS_ENCODER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

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
OPENAI_MAX_OUTPUT_TOKENS = 400
