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
# refer to https://platform.openai.com/docs/models/model-endpoint-compatibility for OpenAI models
# Valid list:
# - openai-completion
# - openai-chat-completion
# - gpt4all-completion -> Due to M1 Macs not having compatible gpt4all version, please install dependency yourself
# - gpt4all-chat-completion-> Due to M1 Macs not having compatible gpt4all version, please install dependency yourself
# To use gpt4all, run: pip install --upgrade gpt4all==1.0.5
# These support HuggingFace Inference API, Inference Endpoints and servers running the text-generation-inference backend
# - huggingface-inference-completion
# - huggingface-inference-chat-completion

INTERNAL_MODEL_VERSION = os.environ.get(
    "INTERNAL_MODEL_VERSION", "openai-chat-completion"
)
# For GPT4ALL, use "ggml-model-gpt4all-falcon-q4_0.bin" for the below for a tested model
GEN_AI_MODEL_VERSION = os.environ.get("GEN_AI_MODEL_VERSION", "gpt-3.5-turbo")
GEN_AI_MAX_OUTPUT_TOKENS = int(os.environ.get("GEN_AI_MAX_OUTPUT_TOKENS", "512"))
# Use HuggingFace API Token for Huggingface inference client
GEN_AI_HUGGINGFACE_API_TOKEN = os.environ.get("GEN_AI_HUGGINGFACE_API_TOKEN", None)
# Use the conversational API with the huggingface-inference-chat-completion internal model
# Note - this only works with models that support conversational interfaces
GEN_AI_HUGGINGFACE_USE_CONVERSATIONAL = (
    os.environ.get("GEN_AI_HUGGINGFACE_USE_CONVERSATIONAL", "").lower() == "true"
)
# Disable streaming responses. Set this to true to "polyfill" streaming for models that don't support streaming
GEN_AI_HUGGINGFACE_DISABLE_STREAM = (
    os.environ.get("GEN_AI_HUGGINGFACE_DISABLE_STREAM", "").lower() == "true"
)

# Danswer custom Deep Learning Models
INTENT_MODEL_VERSION = "danswer/intent-model"
