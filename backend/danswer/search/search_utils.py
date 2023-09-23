from sentence_transformers import CrossEncoder  # type: ignore
from sentence_transformers import SentenceTransformer  # type: ignore
from transformers import AutoTokenizer  # type: ignore
from transformers import TFDistilBertForSequenceClassification  # type: ignore

from danswer.configs.model_configs import CROSS_EMBED_CONTEXT_SIZE
from danswer.configs.model_configs import CROSS_ENCODER_MODEL_ENSEMBLE
from danswer.configs.model_configs import DOC_EMBEDDING_CONTEXT_SIZE
from danswer.configs.model_configs import DOCUMENT_ENCODER_MODEL
from danswer.configs.model_configs import INTENT_MODEL_VERSION
from danswer.configs.model_configs import QUERY_MAX_CONTEXT_SIZE
from danswer.configs.model_configs import SKIP_RERANKING


_TOKENIZER: None | AutoTokenizer = None
_EMBED_MODEL: None | SentenceTransformer = None
_RERANK_MODELS: None | list[CrossEncoder] = None
_INTENT_TOKENIZER: None | AutoTokenizer = None
_INTENT_MODEL: None | TFDistilBertForSequenceClassification = None


def get_default_tokenizer() -> AutoTokenizer:
    global _TOKENIZER
    if _TOKENIZER is None:
        _TOKENIZER = AutoTokenizer.from_pretrained(DOCUMENT_ENCODER_MODEL)
    return _TOKENIZER


def get_default_embedding_model() -> SentenceTransformer:
    global _EMBED_MODEL
    if _EMBED_MODEL is None:
        _EMBED_MODEL = SentenceTransformer(DOCUMENT_ENCODER_MODEL)
        _EMBED_MODEL.max_seq_length = DOC_EMBEDDING_CONTEXT_SIZE
    return _EMBED_MODEL


def get_default_reranking_model_ensemble() -> list[CrossEncoder]:
    global _RERANK_MODELS
    if _RERANK_MODELS is None:
        _RERANK_MODELS = [
            CrossEncoder(model_name) for model_name in CROSS_ENCODER_MODEL_ENSEMBLE
        ]
        for model in _RERANK_MODELS:
            model.max_length = CROSS_EMBED_CONTEXT_SIZE
    return _RERANK_MODELS


def get_default_intent_model_tokenizer() -> AutoTokenizer:
    global _INTENT_TOKENIZER
    if _INTENT_TOKENIZER is None:
        _INTENT_TOKENIZER = AutoTokenizer.from_pretrained(INTENT_MODEL_VERSION)
    return _INTENT_TOKENIZER


def get_default_intent_model() -> TFDistilBertForSequenceClassification:
    global _INTENT_MODEL
    if _INTENT_MODEL is None:
        _INTENT_MODEL = TFDistilBertForSequenceClassification.from_pretrained(
            INTENT_MODEL_VERSION
        )
        _INTENT_MODEL.max_seq_length = QUERY_MAX_CONTEXT_SIZE
    return _INTENT_MODEL


def warm_up_models(
    indexer_only: bool = False, skip_cross_encoders: bool = SKIP_RERANKING
) -> None:
    warm_up_str = "Danswer is amazing"
    get_default_tokenizer()(warm_up_str)
    get_default_embedding_model().encode(warm_up_str)

    if indexer_only:
        return

    if not skip_cross_encoders:
        cross_encoders = get_default_reranking_model_ensemble()
        [
            cross_encoder.predict((warm_up_str, warm_up_str))
            for cross_encoder in cross_encoders
        ]

    intent_tokenizer = get_default_intent_model_tokenizer()
    inputs = intent_tokenizer(
        warm_up_str, return_tensors="tf", truncation=True, padding=True
    )
    get_default_intent_model()(inputs)
