import os

from danswer.configs.constants import DanswerGenAIModel
from danswer.configs.constants import ModelHostType
from danswer.configs.constants import VerifiedModels

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


# Sets the internal Danswer model class to use
INTERNAL_MODEL_VERSION = os.environ.get(
    "INTERNAL_MODEL_VERSION", DanswerGenAIModel.OPENAI_CHAT.value
)

# If the Generative AI model requires an API key for access, otherwise can leave blank
GEN_AI_API_KEY = os.environ.get("GEN_AI_API_KEY", "")

# If using GPT4All or OpenAI, specify the model version
GEN_AI_MODEL_VERSION = os.environ.get("GEN_AI_MODEL_VERSION", VerifiedModels.GPT3.value)

# If the Generative Model is hosted to accept requests (DanswerGenAIModel.REQUEST) then
# set the two below to specify
# - Where to hit the endpoint
# - How should the request be formed
GEN_AI_ENDPOINT = os.environ.get("GEN_AI_ENDPOINT", "")
GEN_AI_HOST_TYPE = os.environ.get("GEN_AI_HOST_TYPE", ModelHostType.HUGGINGFACE.value)

# Set this to be enough for an answer + quotes
GEN_AI_MAX_OUTPUT_TOKENS = int(os.environ.get("GEN_AI_MAX_OUTPUT_TOKENS", "512"))

# Danswer custom Deep Learning Models
INTENT_MODEL_VERSION = "danswer/intent-model"
