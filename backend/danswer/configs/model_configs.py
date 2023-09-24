import os

from danswer.configs.constants import DanswerGenAIModel
from danswer.configs.constants import ModelHostType


#####
# Embedding/Reranking Model Configs
#####
# Important considerations when choosing models
# Max tokens count needs to be high considering use case (at least 512)
# Models used must be MIT or Apache license
# Inference/Indexing speed

# https://huggingface.co/DOCUMENT_ENCODER_MODEL
# The useable models configured as below must be SentenceTransformer compatible
DOCUMENT_ENCODER_MODEL = (
    os.environ.get("DOCUMENT_ENCODER_MODEL") or "thenlper/gte-small"
)
# If the below is changed, Vespa deployment must also be changed
DOC_EMBEDDING_DIM = 384
# Model should be chosen with 512 context size, ideally don't change this
DOC_EMBEDDING_CONTEXT_SIZE = 512
NORMALIZE_EMBEDDINGS = (os.environ.get("SKIP_RERANKING") or "False").lower() == "true"
# These are only used if reranking is turned off, to normalize the direct retrieval scores for display
SIM_SCORE_RANGE_LOW = float(os.environ.get("SIM_SCORE_RANGE_LOW") or 0.0)
SIM_SCORE_RANGE_HIGH = float(os.environ.get("SIM_SCORE_RANGE_HIGH") or 1.0)
# Certain models like e5, BGE, etc use a prefix for asymmetric retrievals (query generally shorter than docs)
ASYM_QUERY_PREFIX = os.environ.get("ASYM_QUERY_PREFIX", "")
ASYM_PASSAGE_PREFIX = os.environ.get("ASYM_PASSAGE_PREFIX", "")
# Purely an optimization, memory limitation consideration
BATCH_SIZE_ENCODE_CHUNKS = 8

# Cross Encoder Settings
SKIP_RERANKING = os.environ.get("SKIP_RERANKING", "").lower() == "true"
# https://www.sbert.net/docs/pretrained-models/ce-msmarco.html
CROSS_ENCODER_MODEL_ENSEMBLE = [
    "cross-encoder/ms-marco-MiniLM-L-4-v2",
    "cross-encoder/ms-marco-TinyBERT-L-2-v2",
]
CROSS_EMBED_CONTEXT_SIZE = 512


# Better to keep it loose, surfacing more results better than missing results
# Currently unused by Vespa
SEARCH_DISTANCE_CUTOFF = 0.1  # Cosine similarity (currently), range of -1 to 1 with -1 being completely opposite

# Intent model max context size
QUERY_MAX_CONTEXT_SIZE = 256


#####
# Generative AI Model Configs
#####
# Other models should work as well, check the library/API compatibility.
# But these are the models that have been verified to work with the existing prompts.
# Using a different model may require some prompt tuning. See qa_prompts.py
VERIFIED_MODELS = {
    DanswerGenAIModel.OPENAI: ["text-davinci-003"],
    DanswerGenAIModel.OPENAI_CHAT: ["gpt-3.5-turbo", "gpt-4"],
    DanswerGenAIModel.GPT4ALL: ["ggml-model-gpt4all-falcon-q4_0.bin"],
    DanswerGenAIModel.GPT4ALL_CHAT: ["ggml-model-gpt4all-falcon-q4_0.bin"],
    # The "chat" model below is actually "instruction finetuned" and does not support conversational
    DanswerGenAIModel.HUGGINGFACE.value: ["meta-llama/Llama-2-70b-chat-hf"],
    DanswerGenAIModel.HUGGINGFACE_CHAT.value: ["meta-llama/Llama-2-70b-hf"],
    # Created by Deepset.ai
    # https://huggingface.co/deepset/deberta-v3-large-squad2
    # Model provided with no modifications
    DanswerGenAIModel.TRANSFORMERS.value: ["deepset/deberta-v3-large-squad2"],
}

# Sets the internal Danswer model class to use
INTERNAL_MODEL_VERSION = os.environ.get(
    "INTERNAL_MODEL_VERSION", DanswerGenAIModel.OPENAI_CHAT.value
)

# If the Generative AI model requires an API key for access, otherwise can leave blank
GEN_AI_API_KEY = os.environ.get("GEN_AI_API_KEY", "")

# If using GPT4All, HuggingFace Inference API, or OpenAI - specify the model version
GEN_AI_MODEL_VERSION = os.environ.get(
    "GEN_AI_MODEL_VERSION",
    VERIFIED_MODELS.get(DanswerGenAIModel(INTERNAL_MODEL_VERSION), [""])[0],
)

# If the Generative Model is hosted to accept requests (DanswerGenAIModel.REQUEST) then
# set the two below to specify
# - Where to hit the endpoint
# - How should the request be formed
GEN_AI_ENDPOINT = os.environ.get("GEN_AI_ENDPOINT", "")
GEN_AI_HOST_TYPE = os.environ.get("GEN_AI_HOST_TYPE", ModelHostType.HUGGINGFACE.value)

# Set this to be enough for an answer + quotes. Also used for Chat
GEN_AI_MAX_OUTPUT_TOKENS = int(os.environ.get("GEN_AI_MAX_OUTPUT_TOKENS") or 1024)
# This next restriction is only used for chat ATM, used to expire old messages as needed
GEN_AI_MAX_INPUT_TOKENS = int(os.environ.get("GEN_AI_MAX_INPUT_TOKENS") or 3000)
GEN_AI_TEMPERATURE = float(os.environ.get("GEN_AI_TEMPERATURE") or 0)

# Danswer custom Deep Learning Models
INTENT_MODEL_VERSION = "danswer/intent-model"

#####
# OpenAI Azure
#####
API_BASE_OPENAI = os.environ.get("API_BASE_OPENAI", "")
API_TYPE_OPENAI = os.environ.get("API_TYPE_OPENAI", "").lower()
API_VERSION_OPENAI = os.environ.get("API_VERSION_OPENAI", "")
# Deployment ID used interchangeably with "engine" parameter
AZURE_DEPLOYMENT_ID = os.environ.get("AZURE_DEPLOYMENT_ID", "")
