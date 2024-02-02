import gc
import logging
import os
from enum import Enum
from typing import Optional
from typing import TYPE_CHECKING

import numpy as np
import requests

from danswer.configs.app_configs import MODEL_SERVER_HOST
from danswer.configs.app_configs import MODEL_SERVER_PORT
from danswer.configs.model_configs import CROSS_EMBED_CONTEXT_SIZE
from danswer.configs.model_configs import CROSS_ENCODER_MODEL_ENSEMBLE
from danswer.configs.model_configs import DOC_EMBEDDING_CONTEXT_SIZE
from danswer.configs.model_configs import DOCUMENT_ENCODER_MODEL
from danswer.configs.model_configs import INTENT_MODEL_VERSION
from danswer.configs.model_configs import QUERY_MAX_CONTEXT_SIZE
from danswer.utils.logger import setup_logger
from shared_models.model_server_models import EmbedRequest
from shared_models.model_server_models import EmbedResponse
from shared_models.model_server_models import IntentRequest
from shared_models.model_server_models import IntentResponse
from shared_models.model_server_models import RerankRequest
from shared_models.model_server_models import RerankResponse


os.environ["TOKENIZERS_PARALLELISM"] = "false"

logger = setup_logger()
# Remove useless info about layer initialization
logging.getLogger("transformers").setLevel(logging.ERROR)


if TYPE_CHECKING:
    from sentence_transformers import CrossEncoder  # type: ignore
    from sentence_transformers import SentenceTransformer  # type: ignore
    from transformers import AutoTokenizer  # type: ignore
    from transformers import TFDistilBertForSequenceClassification  # type: ignore


_TOKENIZER: tuple[Optional["AutoTokenizer"], str | None] = (None, None)
_EMBED_MODEL: tuple[Optional["SentenceTransformer"], str | None] = (None, None)
_RERANK_MODELS: Optional[list["CrossEncoder"]] = None
_INTENT_TOKENIZER: Optional["AutoTokenizer"] = None
_INTENT_MODEL: Optional["TFDistilBertForSequenceClassification"] = None


class EmbedTextType(str, Enum):
    QUERY = "query"
    PASSAGE = "passage"


def clean_model_name(model_str: str) -> str:
    return model_str.replace("/", "_").replace("-", "_").replace(".", "_")


# NOTE: If None is used, it may not be using the "correct" tokenizer, for cases
# where this is more important, be sure to refresh with the actual model name
def get_default_tokenizer(model_name: str | None = None) -> "AutoTokenizer":
    # NOTE: doing a local import here to avoid reduce memory usage caused by
    # processes importing this file despite not using any of this
    from transformers import AutoTokenizer  # type: ignore

    global _TOKENIZER
    if _TOKENIZER[0] is None or (
        _TOKENIZER[1] is not None and _TOKENIZER[1] != model_name
    ):
        if _TOKENIZER[0] is not None:
            del _TOKENIZER
            gc.collect()

        if model_name is None:
            # This could be inaccurate
            model_name = DOCUMENT_ENCODER_MODEL

        _TOKENIZER = (AutoTokenizer.from_pretrained(model_name), model_name)

        if hasattr(_TOKENIZER[0], "is_fast") and _TOKENIZER[0].is_fast:
            os.environ["TOKENIZERS_PARALLELISM"] = "false"

    return _TOKENIZER[0]


def get_local_embedding_model(
    model_name: str,
    max_context_length: int = DOC_EMBEDDING_CONTEXT_SIZE,
) -> "SentenceTransformer":
    # NOTE: doing a local import here to avoid reduce memory usage caused by
    # processes importing this file despite not using any of this
    from sentence_transformers import SentenceTransformer  # type: ignore

    global _EMBED_MODEL
    if (
        _EMBED_MODEL[0] is None
        or max_context_length != _EMBED_MODEL[0].max_seq_length
        or model_name != _EMBED_MODEL[1]
    ):
        if _EMBED_MODEL[0] is not None:
            del _EMBED_MODEL
            gc.collect()

        logger.info(f"Loading {model_name}")
        _EMBED_MODEL = (SentenceTransformer(model_name), model_name)
        _EMBED_MODEL[0].max_seq_length = max_context_length
    return _EMBED_MODEL[0]


def get_local_reranking_model_ensemble(
    model_names: list[str] = CROSS_ENCODER_MODEL_ENSEMBLE,
    max_context_length: int = CROSS_EMBED_CONTEXT_SIZE,
) -> list["CrossEncoder"]:
    # NOTE: doing a local import here to avoid reduce memory usage caused by
    # processes importing this file despite not using any of this
    from sentence_transformers import CrossEncoder

    global _RERANK_MODELS
    if _RERANK_MODELS is None or max_context_length != _RERANK_MODELS[0].max_length:
        _RERANK_MODELS = []
        for model_name in model_names:
            logger.info(f"Loading {model_name}")
            model = CrossEncoder(model_name)
            model.max_length = max_context_length
            _RERANK_MODELS.append(model)
    return _RERANK_MODELS


def get_intent_model_tokenizer(
    model_name: str = INTENT_MODEL_VERSION,
) -> "AutoTokenizer":
    # NOTE: doing a local import here to avoid reduce memory usage caused by
    # processes importing this file despite not using any of this
    from transformers import AutoTokenizer  # type: ignore

    global _INTENT_TOKENIZER
    if _INTENT_TOKENIZER is None:
        _INTENT_TOKENIZER = AutoTokenizer.from_pretrained(model_name)
    return _INTENT_TOKENIZER


def get_local_intent_model(
    model_name: str = INTENT_MODEL_VERSION,
    max_context_length: int = QUERY_MAX_CONTEXT_SIZE,
) -> "TFDistilBertForSequenceClassification":
    # NOTE: doing a local import here to avoid reduce memory usage caused by
    # processes importing this file despite not using any of this
    from transformers import TFDistilBertForSequenceClassification  # type: ignore

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
        model_name: str,
        query_prefix: str | None,
        passage_prefix: str | None,
        normalize: bool,
        server_host: str | None,  # Changes depending on indexing or inference
        server_port: int | None,
        # The following are globals are currently not configurable
        max_seq_length: int = DOC_EMBEDDING_CONTEXT_SIZE,
    ) -> None:
        self.model_name = model_name
        self.max_seq_length = max_seq_length
        self.query_prefix = query_prefix
        self.passage_prefix = passage_prefix
        self.normalize = normalize

        model_server_url = build_model_server_url(server_host, server_port)
        self.embed_server_endpoint = (
            f"{model_server_url}/encoder/bi-encoder-embed" if model_server_url else None
        )

    def load_model(self) -> Optional["SentenceTransformer"]:
        if self.embed_server_endpoint:
            return None

        return get_local_embedding_model(
            model_name=self.model_name, max_context_length=self.max_seq_length
        )

    def encode(self, texts: list[str], text_type: EmbedTextType) -> list[list[float]]:
        if text_type == EmbedTextType.QUERY and self.query_prefix:
            prefixed_texts = [self.query_prefix + text for text in texts]
        elif text_type == EmbedTextType.PASSAGE and self.passage_prefix:
            prefixed_texts = [self.passage_prefix + text for text in texts]
        else:
            prefixed_texts = texts

        if self.embed_server_endpoint:
            embed_request = EmbedRequest(
                texts=prefixed_texts,
                model_name=self.model_name,
                normalize_embeddings=self.normalize,
            )

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
            prefixed_texts, normalize_embeddings=self.normalize
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

    def load_model(self) -> list["CrossEncoder"] | None:
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

    def load_model(self) -> Optional["SentenceTransformer"]:
        if self.intent_server_endpoint:
            return None

        return get_local_intent_model(
            model_name=self.model_name, max_context_length=self.max_seq_length
        )

    def predict(
        self,
        query: str,
    ) -> list[float]:
        # NOTE: doing a local import here to avoid reduce memory usage caused by
        # processes importing this file despite not using any of this
        import tensorflow as tf  # type: ignore

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
    model_name: str,
    normalize: bool,
    skip_cross_encoders: bool = False,
    indexer_only: bool = False,
) -> None:
    warm_up_str = (
        "Danswer is amazing! Check out our easy deployment guide at "
        "https://docs.danswer.dev/quickstart"
    )

    get_default_tokenizer(model_name=model_name)(warm_up_str)

    embed_model = EmbeddingModel(
        model_name=model_name,
        normalize=normalize,
        # These don't matter, if it's a remote model, this function shouldn't be called
        query_prefix=None,
        passage_prefix=None,
        server_host=None,
        server_port=None,
    )

    embed_model.encode(texts=[warm_up_str], text_type=EmbedTextType.QUERY)

    if indexer_only:
        return

    if not skip_cross_encoders:
        CrossEncoderEnsembleModel().predict(query=warm_up_str, passages=[warm_up_str])

    intent_tokenizer = get_intent_model_tokenizer()
    inputs = intent_tokenizer(
        warm_up_str, return_tensors="tf", truncation=True, padding=True
    )
    get_local_intent_model()(inputs)
