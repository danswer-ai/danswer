import logging
import os

import numpy as np
import requests
import tensorflow as tf  # type: ignore
from sentence_transformers import CrossEncoder  # type: ignore
from sentence_transformers import SentenceTransformer  # type: ignore
from transformers import AutoTokenizer  # type: ignore
from transformers import TFDistilBertForSequenceClassification  # type: ignore

from danswer.configs.app_configs import CURRENT_PROCESS_IS_AN_INDEXING_JOB
from danswer.configs.app_configs import INDEXING_MODEL_SERVER_HOST
from danswer.configs.app_configs import MODEL_SERVER_HOST
from danswer.configs.app_configs import MODEL_SERVER_PORT
from danswer.configs.model_configs import CROSS_EMBED_CONTEXT_SIZE
from danswer.configs.model_configs import CROSS_ENCODER_MODEL_ENSEMBLE
from danswer.configs.model_configs import DOC_EMBEDDING_CONTEXT_SIZE
from danswer.configs.model_configs import DOCUMENT_ENCODER_MODEL
from danswer.configs.model_configs import INTENT_MODEL_VERSION
from danswer.configs.model_configs import NORMALIZE_EMBEDDINGS
from danswer.configs.model_configs import QUERY_MAX_CONTEXT_SIZE
from danswer.utils.logger import setup_logger
from shared_models.model_server_models import EmbedRequest
from shared_models.model_server_models import EmbedResponse
from shared_models.model_server_models import IntentRequest
from shared_models.model_server_models import IntentResponse
from shared_models.model_server_models import RerankRequest
from shared_models.model_server_models import RerankResponse

logger = setup_logger()
# Remove useless info about layer initialization
logging.getLogger("transformers").setLevel(logging.ERROR)


_TOKENIZER: None | AutoTokenizer = None
_EMBED_MODEL: None | SentenceTransformer = None
_RERANK_MODELS: None | list[CrossEncoder] = None
_INTENT_TOKENIZER: None | AutoTokenizer = None
_INTENT_MODEL: None | TFDistilBertForSequenceClassification = None


def get_default_tokenizer() -> AutoTokenizer:
    global _TOKENIZER
    if _TOKENIZER is None:
        _TOKENIZER = AutoTokenizer.from_pretrained(DOCUMENT_ENCODER_MODEL)
        if hasattr(_TOKENIZER, "is_fast") and _TOKENIZER.is_fast:
            os.environ["TOKENIZERS_PARALLELISM"] = "false"
    return _TOKENIZER


def get_local_embedding_model(
    model_name: str = DOCUMENT_ENCODER_MODEL,
    max_context_length: int = DOC_EMBEDDING_CONTEXT_SIZE,
) -> SentenceTransformer:
    global _EMBED_MODEL
    if _EMBED_MODEL is None or max_context_length != _EMBED_MODEL.max_seq_length:
        logger.info(f"Loading {model_name}")
        _EMBED_MODEL = SentenceTransformer(model_name)
        _EMBED_MODEL.max_seq_length = max_context_length
    return _EMBED_MODEL


def get_local_reranking_model_ensemble(
    model_names: list[str] = CROSS_ENCODER_MODEL_ENSEMBLE,
    max_context_length: int = CROSS_EMBED_CONTEXT_SIZE,
) -> list[CrossEncoder]:
    global _RERANK_MODELS
    if _RERANK_MODELS is None or max_context_length != _RERANK_MODELS[0].max_length:
        _RERANK_MODELS = []
        for model_name in model_names:
            logger.info(f"Loading {model_name}")
            model = CrossEncoder(model_name)
            model.max_length = max_context_length
            _RERANK_MODELS.append(model)
    return _RERANK_MODELS


def get_intent_model_tokenizer(model_name: str = INTENT_MODEL_VERSION) -> AutoTokenizer:
    global _INTENT_TOKENIZER
    if _INTENT_TOKENIZER is None:
        _INTENT_TOKENIZER = AutoTokenizer.from_pretrained(model_name)
    return _INTENT_TOKENIZER


def get_local_intent_model(
    model_name: str = INTENT_MODEL_VERSION,
    max_context_length: int = QUERY_MAX_CONTEXT_SIZE,
) -> TFDistilBertForSequenceClassification:
    global _INTENT_MODEL
    if _INTENT_MODEL is None or max_context_length != _INTENT_MODEL.max_seq_length:
        _INTENT_MODEL = TFDistilBertForSequenceClassification.from_pretrained(
            model_name
        )
        _INTENT_MODEL.max_seq_length = max_context_length
    return _INTENT_MODEL


def build_model_server_url(
    model_server_host: str | None,
    model_server_port: int | None,
) -> str | None:
    if not model_server_host or model_server_port is None:
        return None

    model_server_url = f"{model_server_host}:{model_server_port}"

    # use protocol if provided
    if "http" in model_server_url:
        return model_server_url

    # otherwise default to http
    return f"http://{model_server_url}"


class EmbeddingModel:
    def __init__(
        self,
        model_name: str = DOCUMENT_ENCODER_MODEL,
        max_seq_length: int = DOC_EMBEDDING_CONTEXT_SIZE,
        model_server_host: str | None = MODEL_SERVER_HOST,
        indexing_model_server_host: str | None = INDEXING_MODEL_SERVER_HOST,
        model_server_port: int = MODEL_SERVER_PORT,
        is_indexing: bool = CURRENT_PROCESS_IS_AN_INDEXING_JOB,
    ) -> None:
        self.model_name = model_name
        self.max_seq_length = max_seq_length

        used_model_server_host = (
            indexing_model_server_host if is_indexing else model_server_host
        )

        model_server_url = build_model_server_url(
            used_model_server_host, model_server_port
        )
        self.embed_server_endpoint = (
            model_server_url + "/encoder/bi-encoder-embed" if model_server_url else None
        )

    def load_model(self) -> SentenceTransformer | None:
        if self.embed_server_endpoint:
            return None

        return get_local_embedding_model(
            model_name=self.model_name, max_context_length=self.max_seq_length
        )

    def encode(
        self, texts: list[str], normalize_embeddings: bool = NORMALIZE_EMBEDDINGS
    ) -> list[list[float]]:
        if self.embed_server_endpoint:
            embed_request = EmbedRequest(texts=texts)

            try:
                response = requests.post(
                    self.embed_server_endpoint, json=embed_request.dict()
                )
                response.raise_for_status()

                return EmbedResponse(**response.json()).embeddings
            except requests.RequestException as e:
                logger.exception(f"Failed to get Embedding: {e}")
                raise

        local_model = self.load_model()

        if local_model is None:
            raise RuntimeError("Failed to load local Embedding Model")

        return local_model.encode(
            texts, normalize_embeddings=normalize_embeddings
        ).tolist()


class CrossEncoderEnsembleModel:
    def __init__(
        self,
        model_names: list[str] = CROSS_ENCODER_MODEL_ENSEMBLE,
        max_seq_length: int = CROSS_EMBED_CONTEXT_SIZE,
        model_server_host: str | None = MODEL_SERVER_HOST,
        model_server_port: int = MODEL_SERVER_PORT,
    ) -> None:
        self.model_names = model_names
        self.max_seq_length = max_seq_length

        model_server_url = build_model_server_url(model_server_host, model_server_port)
        self.rerank_server_endpoint = (
            model_server_url + "/encoder/cross-encoder-scores"
            if model_server_url
            else None
        )

    def load_model(self) -> list[CrossEncoder] | None:
        if self.rerank_server_endpoint:
            return None

        return get_local_reranking_model_ensemble(
            model_names=self.model_names, max_context_length=self.max_seq_length
        )

    def predict(self, query: str, passages: list[str]) -> list[list[float]]:
        if self.rerank_server_endpoint:
            rerank_request = RerankRequest(query=query, documents=passages)

            try:
                response = requests.post(
                    self.rerank_server_endpoint, json=rerank_request.dict()
                )
                response.raise_for_status()

                return RerankResponse(**response.json()).scores
            except requests.RequestException as e:
                logger.exception(f"Failed to get Reranking Scores: {e}")
                raise

        local_models = self.load_model()

        if local_models is None:
            raise RuntimeError("Failed to load local Reranking Model Ensemble")

        scores = [
            cross_encoder.predict([(query, passage) for passage in passages]).tolist()  # type: ignore
            for cross_encoder in local_models
        ]

        return scores


class IntentModel:
    def __init__(
        self,
        model_name: str = INTENT_MODEL_VERSION,
        max_seq_length: int = QUERY_MAX_CONTEXT_SIZE,
        model_server_host: str | None = MODEL_SERVER_HOST,
        model_server_port: int = MODEL_SERVER_PORT,
    ) -> None:
        self.model_name = model_name
        self.max_seq_length = max_seq_length

        model_server_url = build_model_server_url(model_server_host, model_server_port)
        self.intent_server_endpoint = (
            model_server_url + "/custom/intent-model" if model_server_url else None
        )

    def load_model(self) -> SentenceTransformer | None:
        if self.intent_server_endpoint:
            return None

        return get_local_intent_model(
            model_name=self.model_name, max_context_length=self.max_seq_length
        )

    def predict(
        self,
        query: str,
    ) -> list[float]:
        if self.intent_server_endpoint:
            intent_request = IntentRequest(query=query)

            try:
                response = requests.post(
                    self.intent_server_endpoint, json=intent_request.dict()
                )
                response.raise_for_status()

                return IntentResponse(**response.json()).class_probs
            except requests.RequestException as e:
                logger.exception(f"Failed to get Embedding: {e}")
                raise

        tokenizer = get_intent_model_tokenizer()
        local_model = self.load_model()

        if local_model is None:
            raise RuntimeError("Failed to load local Intent Model")

        intent_model = get_local_intent_model()
        model_input = tokenizer(
            query, return_tensors="tf", truncation=True, padding=True
        )

        predictions = intent_model(model_input)[0]
        probabilities = tf.nn.softmax(predictions, axis=-1)
        class_percentages = np.round(probabilities.numpy() * 100, 2)

        return list(class_percentages.tolist()[0])


def warm_up_models(
    skip_cross_encoders: bool = False,
    indexer_only: bool = False,
) -> None:
    warm_up_str = (
        "Danswer is amazing! Check out our easy deployment guide at "
        "https://docs.danswer.dev/quickstart"
    )
    get_default_tokenizer()(warm_up_str)

    EmbeddingModel().encode(texts=[warm_up_str])

    if indexer_only:
        return

    if not skip_cross_encoders:
        CrossEncoderEnsembleModel().predict(query=warm_up_str, passages=[warm_up_str])

    intent_tokenizer = get_intent_model_tokenizer()
    inputs = intent_tokenizer(
        warm_up_str, return_tensors="tf", truncation=True, padding=True
    )
    get_local_intent_model()(inputs)
