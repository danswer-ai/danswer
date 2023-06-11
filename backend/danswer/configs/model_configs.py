import os

# Important considerations when choosing models
# Max tokens count needs to be high considering use case (at least 512)
# Models used must be MIT or Apache license
# Inference/Indexing speed

# https://www.sbert.net/docs/pretrained_models.html
# Use 'multi-qa-MiniLM-L6-cos-v1' if license is added because it is 3x faster (384 dimensional embedding)
# Context size is 256 for above though
DOCUMENT_ENCODER_MODEL = "sentence-transformers/all-distilroberta-v1"
DOC_EMBEDDING_DIM = 768  # Depends on the document encoder model

# https://www.sbert.net/docs/pretrained-models/ce-msmarco.html
# Previously using "cross-encoder/ms-marco-MiniLM-L-6-v2" alone
CROSS_ENCODER_MODEL_ENSEMBLE = [
    "cross-encoder/ms-marco-MiniLM-L-4-v2",
    "cross-encoder/ms-marco-TinyBERT-L-2-v2",
]

# Better to keep it loose, surfacing more results better than missing results
SEARCH_DISTANCE_CUTOFF = 0.1  # Cosine similarity (currently), range of -1 to 1 with -1 being completely opposite

QUERY_MAX_CONTEXT_SIZE = 256
# The below is correlated with CHUNK_SIZE in app_configs but not strictly calculated
# To avoid extra overhead of tokenizing for chunking during indexing.
DOC_EMBEDDING_CONTEXT_SIZE = 512
CROSS_EMBED_CONTEXT_SIZE = 512

# Purely an optimization, memory limitation consideration
BATCH_SIZE_ENCODE_CHUNKS = 8

# QA Model API Configs
# https://platform.openai.com/docs/models/model-endpoint-compatibility
INTERNAL_MODEL_VERSION = os.environ.get("INTERNAL_MODEL", "openai-chat-completion")
OPENAI_MODEL_VERSION = os.environ.get("OPENAI_MODEL_VERSION", "gpt-3.5-turbo")
OPENAI_MAX_OUTPUT_TOKENS = 512

# Danswer custom Deep Learning Models
INTENT_MODEL_VERSION = "danswer/intent-model"
