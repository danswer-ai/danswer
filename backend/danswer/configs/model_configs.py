import os

#####
# Embedding/Reranking Model Configs
#####
CHUNK_SIZE = 512
# Important considerations when choosing models
# Max tokens count needs to be high considering use case (at least 512)
# Models used must be MIT or Apache license
# Inference/Indexing speed
# https://huggingface.co/DOCUMENT_ENCODER_MODEL
# The useable models configured as below must be SentenceTransformer compatible
DOCUMENT_ENCODER_MODEL = (
    # This is not a good model anymore, but this default needs to be kept for not breaking existing
    # deployments, will eventually be retired/swapped for a different default model
    os.environ.get("DOCUMENT_ENCODER_MODEL")
    or "thenlper/gte-small"
)
# If the below is changed, Vespa deployment must also be changed
DOC_EMBEDDING_DIM = int(os.environ.get("DOC_EMBEDDING_DIM") or 384)
# Model should be chosen with 512 context size, ideally don't change this
DOC_EMBEDDING_CONTEXT_SIZE = 512
NORMALIZE_EMBEDDINGS = (
    os.environ.get("NORMALIZE_EMBEDDINGS") or "False"
).lower() == "true"
# These are only used if reranking is turned off, to normalize the direct retrieval scores for display
# Currently unused
SIM_SCORE_RANGE_LOW = float(os.environ.get("SIM_SCORE_RANGE_LOW") or 0.0)
SIM_SCORE_RANGE_HIGH = float(os.environ.get("SIM_SCORE_RANGE_HIGH") or 1.0)
# Certain models like e5, BGE, etc use a prefix for asymmetric retrievals (query generally shorter than docs)
ASYM_QUERY_PREFIX = os.environ.get("ASYM_QUERY_PREFIX", "")
ASYM_PASSAGE_PREFIX = os.environ.get("ASYM_PASSAGE_PREFIX", "")
# Purely an optimization, memory limitation consideration
BATCH_SIZE_ENCODE_CHUNKS = 8
# This controls the minimum number of pytorch "threads" to allocate to the embedding
# model. If torch finds more threads on its own, this value is not used.
MIN_THREADS_ML_MODELS = int(os.environ.get("MIN_THREADS_ML_MODELS") or 1)


# Cross Encoder Settings
ENABLE_RERANKING_ASYNC_FLOW = (
    os.environ.get("ENABLE_RERANKING_ASYNC_FLOW", "").lower() == "true"
)
ENABLE_RERANKING_REAL_TIME_FLOW = (
    os.environ.get("ENABLE_RERANKING_REAL_TIME_FLOW", "").lower() == "true"
)
# https://www.sbert.net/docs/pretrained-models/ce-msmarco.html
CROSS_ENCODER_MODEL_ENSEMBLE = [
    "cross-encoder/ms-marco-MiniLM-L-4-v2",
    "cross-encoder/ms-marco-TinyBERT-L-2-v2",
]
# For score normalizing purposes, only way is to know the expected ranges
CROSS_ENCODER_RANGE_MAX = 12
CROSS_ENCODER_RANGE_MIN = -12
CROSS_EMBED_CONTEXT_SIZE = 512

# Unused currently, can't be used with the current default encoder model due to its output range
SEARCH_DISTANCE_CUTOFF = 0

# Intent model max context size
QUERY_MAX_CONTEXT_SIZE = 256

# Danswer custom Deep Learning Models
INTENT_MODEL_VERSION = "danswer/intent-model"


#####
# Generative AI Model Configs
#####

# If changing GEN_AI_MODEL_PROVIDER or GEN_AI_MODEL_VERSION from the default,
# be sure to use one that is LiteLLM compatible:
# https://litellm.vercel.app/docs/providers/azure#completion---using-env-variables
# The provider is the prefix before / in the model argument

# Additionally Danswer supports GPT4All and custom request library based models
# Set GEN_AI_MODEL_PROVIDER to "custom" to use the custom requests approach
# Set GEN_AI_MODEL_PROVIDER to "gpt4all" to use gpt4all models running locally
GEN_AI_MODEL_PROVIDER = os.environ.get("GEN_AI_MODEL_PROVIDER") or "openai"
# If using Azure, it's the engine name, for example: Danswer
GEN_AI_MODEL_VERSION = os.environ.get("GEN_AI_MODEL_VERSION") or "gpt-3.5-turbo-0125"
# For secondary flows like extracting filters or deciding if a chunk is useful, we don't need
# as powerful of a model as say GPT-4 so we can use an alternative that is faster and cheaper
FAST_GEN_AI_MODEL_VERSION = (
    os.environ.get("FAST_GEN_AI_MODEL_VERSION") or GEN_AI_MODEL_VERSION
)

# If the Generative AI model requires an API key for access, otherwise can leave blank
GEN_AI_API_KEY = (
    os.environ.get("GEN_AI_API_KEY", os.environ.get("OPENAI_API_KEY")) or None
)

# API Base, such as (for Azure): https://danswer.openai.azure.com/
GEN_AI_API_ENDPOINT = os.environ.get("GEN_AI_API_ENDPOINT") or None
# API Version, such as (for Azure): 2023-09-15-preview
GEN_AI_API_VERSION = os.environ.get("GEN_AI_API_VERSION") or None
# LiteLLM custom_llm_provider
GEN_AI_LLM_PROVIDER_TYPE = os.environ.get("GEN_AI_LLM_PROVIDER_TYPE") or None
# Override the auto-detection of LLM max context length
GEN_AI_MAX_TOKENS = int(os.environ.get("GEN_AI_MAX_TOKENS") or 0) or None
# Set this to be enough for an answer + quotes. Also used for Chat
GEN_AI_MAX_OUTPUT_TOKENS = int(os.environ.get("GEN_AI_MAX_OUTPUT_TOKENS") or 1024)
# Number of tokens from chat history to include at maximum
# 3000 should be enough context regardless of use, no need to include as much as possible
# as this drives up the cost unnecessarily
GEN_AI_HISTORY_CUTOFF = 3000
# This is used when computing how much context space is available for documents
# ahead of time in order to let the user know if they can "select" more documents
# It represents a maximum "expected" number of input tokens from the latest user
# message. At query time, we don't actually enforce this - we will only throw an
# error if the total # of tokens exceeds the max input tokens.
GEN_AI_SINGLE_USER_MESSAGE_EXPECTED_MAX_TOKENS = 512
GEN_AI_TEMPERATURE = float(os.environ.get("GEN_AI_TEMPERATURE") or 0)
