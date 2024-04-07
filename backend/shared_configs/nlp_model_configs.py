import os


# Danswer custom Deep Learning Models
INTENT_MODEL_VERSION = "danswer/intent-model"
INTENT_MODEL_CONTEXT_SIZE = 256

# Bi-Encoder, other details
DOC_EMBEDDING_CONTEXT_SIZE = 512

# Only using one cross-encoder for now
CROSS_ENCODER_MODEL_ENSEMBLE = ["mixedbread-ai/mxbai-rerank-xsmall-v1"]
CROSS_EMBED_CONTEXT_SIZE = 512

# This controls the minimum number of pytorch "threads" to allocate to the embedding
# model. If torch finds more threads on its own, this value is not used.
MIN_THREADS_ML_MODELS = int(os.environ.get("MIN_THREADS_ML_MODELS") or 1)
