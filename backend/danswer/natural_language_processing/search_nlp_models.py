import threading
import time
from collections.abc import Callable
from functools import wraps
from typing import Any

import requests
from httpx import HTTPError
from requests import JSONDecodeError
from requests import RequestException
from requests import Response
from retry import retry

from danswer.configs.app_configs import LARGE_CHUNK_RATIO
from danswer.configs.model_configs import BATCH_SIZE_ENCODE_CHUNKS
from danswer.configs.model_configs import (
    BATCH_SIZE_ENCODE_CHUNKS_FOR_API_EMBEDDING_SERVICES,
)
from danswer.configs.model_configs import DOC_EMBEDDING_CONTEXT_SIZE
from danswer.db.models import SearchSettings
from danswer.indexing.indexing_heartbeat import IndexingHeartbeatInterface
from danswer.natural_language_processing.exceptions import (
    ModelServerRateLimitError,
)
from danswer.natural_language_processing.utils import get_tokenizer
from danswer.natural_language_processing.utils import tokenizer_trim_content
from danswer.utils.logger import setup_logger
from shared_configs.configs import MODEL_SERVER_HOST
from shared_configs.configs import MODEL_SERVER_PORT
from shared_configs.enums import EmbeddingProvider
from shared_configs.enums import EmbedTextType
from shared_configs.enums import RerankerProvider
from shared_configs.model_server_models import ConnectorClassificationRequest
from shared_configs.model_server_models import ConnectorClassificationResponse
from shared_configs.model_server_models import Embedding
from shared_configs.model_server_models import EmbedRequest
from shared_configs.model_server_models import EmbedResponse
from shared_configs.model_server_models import IntentRequest
from shared_configs.model_server_models import IntentResponse
from shared_configs.model_server_models import RerankRequest
from shared_configs.model_server_models import RerankResponse
from shared_configs.utils import batch_list

logger = setup_logger()


WARM_UP_STRINGS = [
    "Danswer is amazing!",
    "Check out our easy deployment guide at",
    "https://docs.danswer.dev/quickstart",
]


def clean_model_name(model_str: str) -> str:
    return model_str.replace("/", "_").replace("-", "_").replace(".", "_")


def build_model_server_url(
    model_server_host: str,
    model_server_port: int,
) -> str:
    model_server_url = f"{model_server_host}:{model_server_port}"

    # use protocol if provided
    if "http" in model_server_url:
        return model_server_url

    # otherwise default to http
    return f"http://{model_server_url}"


class EmbeddingModel:
    def __init__(
        self,
        server_host: str,  # Changes depending on indexing or inference
        server_port: int,
        model_name: str | None,
        normalize: bool,
        query_prefix: str | None,
        passage_prefix: str | None,
        api_key: str | None,
        api_url: str | None,
        provider_type: EmbeddingProvider | None,
        retrim_content: bool = False,
        callback: IndexingHeartbeatInterface | None = None,
        api_version: str | None = None,
        deployment_name: str | None = None,
    ) -> None:
        self.api_key = api_key
        self.provider_type = provider_type
        self.query_prefix = query_prefix
        self.passage_prefix = passage_prefix
        self.normalize = normalize
        self.model_name = model_name
        self.retrim_content = retrim_content
        self.api_url = api_url
        self.api_version = api_version
        self.deployment_name = deployment_name
        self.tokenizer = get_tokenizer(
            model_name=model_name, provider_type=provider_type
        )
        self.callback = callback

        model_server_url = build_model_server_url(server_host, server_port)
        self.embed_server_endpoint = f"{model_server_url}/encoder/bi-encoder-embed"

    def _make_model_server_request(self, embed_request: EmbedRequest) -> EmbedResponse:
        def _make_request() -> Response:
            response = requests.post(
                self.embed_server_endpoint, json=embed_request.model_dump()
            )
            # signify that this is a rate limit error
            if response.status_code == 429:
                raise ModelServerRateLimitError(response.text)

            response.raise_for_status()
            return response

        final_make_request_func = _make_request

        # if the text type is a passage, add some default
        # retries + handling for rate limiting
        if embed_request.text_type == EmbedTextType.PASSAGE:
            final_make_request_func = retry(
                tries=3,
                delay=5,
                exceptions=(RequestException, ValueError, JSONDecodeError),
            )(final_make_request_func)
            # use 10 second delay as per Azure suggestion
            final_make_request_func = retry(
                tries=10, delay=10, exceptions=ModelServerRateLimitError
            )(final_make_request_func)

        try:
            response = final_make_request_func()
            return EmbedResponse(**response.json())
        except requests.HTTPError as e:
            try:
                error_detail = response.json().get("detail", str(e))
            except Exception:
                error_detail = response.text
            raise HTTPError(f"HTTP error occurred: {error_detail}") from e
        except requests.RequestException as e:
            raise HTTPError(f"Request failed: {str(e)}") from e

    def _batch_encode_texts(
        self,
        texts: list[str],
        text_type: EmbedTextType,
        batch_size: int,
        max_seq_length: int,
    ) -> list[Embedding]:
        text_batches = batch_list(texts, batch_size)

        logger.debug(
            f"Encoding {len(texts)} texts in {len(text_batches)} batches for local model"
        )

        embeddings: list[Embedding] = []
        for idx, text_batch in enumerate(text_batches, start=1):
            if self.callback:
                if self.callback.should_stop():
                    raise RuntimeError("_batch_encode_texts detected stop signal")

            logger.debug(f"Encoding batch {idx} of {len(text_batches)}")
            embed_request = EmbedRequest(
                model_name=self.model_name,
                texts=text_batch,
                api_version=self.api_version,
                deployment_name=self.deployment_name,
                max_context_length=max_seq_length,
                normalize_embeddings=self.normalize,
                api_key=self.api_key,
                provider_type=self.provider_type,
                text_type=text_type,
                manual_query_prefix=self.query_prefix,
                manual_passage_prefix=self.passage_prefix,
                api_url=self.api_url,
            )

            response = self._make_model_server_request(embed_request)
            embeddings.extend(response.embeddings)

            if self.callback:
                self.callback.progress("_batch_encode_texts", 0)
        return embeddings

    def encode(
        self,
        texts: list[str],
        text_type: EmbedTextType,
        large_chunks_present: bool = False,
        local_embedding_batch_size: int = BATCH_SIZE_ENCODE_CHUNKS,
        api_embedding_batch_size: int = BATCH_SIZE_ENCODE_CHUNKS_FOR_API_EMBEDDING_SERVICES,
        max_seq_length: int = DOC_EMBEDDING_CONTEXT_SIZE,
    ) -> list[Embedding]:
        if not texts or not all(texts):
            raise ValueError(f"Empty or missing text for embedding: {texts}")

        if large_chunks_present:
            max_seq_length *= LARGE_CHUNK_RATIO

        if self.retrim_content:
            # This is applied during indexing as a catchall for overly long titles (or other uncapped fields)
            # Note that this uses just the default tokenizer which may also lead to very minor miscountings
            # However this slight miscounting is very unlikely to have any material impact.
            texts = [
                tokenizer_trim_content(
                    content=text,
                    desired_length=max_seq_length,
                    tokenizer=self.tokenizer,
                )
                for text in texts
            ]

        batch_size = (
            api_embedding_batch_size
            if self.provider_type
            else local_embedding_batch_size
        )

        return self._batch_encode_texts(
            texts=texts,
            text_type=text_type,
            batch_size=batch_size,
            max_seq_length=max_seq_length,
        )

    @classmethod
    def from_db_model(
        cls,
        search_settings: SearchSettings,
        server_host: str,  # Changes depending on indexing or inference
        server_port: int,
        retrim_content: bool = False,
    ) -> "EmbeddingModel":
        return cls(
            server_host=server_host,
            server_port=server_port,
            model_name=search_settings.model_name,
            normalize=search_settings.normalize,
            query_prefix=search_settings.query_prefix,
            passage_prefix=search_settings.passage_prefix,
            api_key=search_settings.api_key,
            provider_type=search_settings.provider_type,
            api_url=search_settings.api_url,
            retrim_content=retrim_content,
            api_version=search_settings.api_version,
            deployment_name=search_settings.deployment_name,
        )


class RerankingModel:
    def __init__(
        self,
        model_name: str,
        provider_type: RerankerProvider | None,
        api_key: str | None,
        api_url: str | None,
        model_server_host: str = MODEL_SERVER_HOST,
        model_server_port: int = MODEL_SERVER_PORT,
    ) -> None:
        model_server_url = build_model_server_url(model_server_host, model_server_port)
        self.rerank_server_endpoint = model_server_url + "/encoder/cross-encoder-scores"
        self.model_name = model_name
        self.provider_type = provider_type
        self.api_key = api_key
        self.api_url = api_url

    def predict(self, query: str, passages: list[str]) -> list[float]:
        rerank_request = RerankRequest(
            query=query,
            documents=passages,
            model_name=self.model_name,
            provider_type=self.provider_type,
            api_key=self.api_key,
            api_url=self.api_url,
        )

        response = requests.post(
            self.rerank_server_endpoint, json=rerank_request.model_dump()
        )
        response.raise_for_status()

        return RerankResponse(**response.json()).scores


class QueryAnalysisModel:
    def __init__(
        self,
        model_server_host: str = MODEL_SERVER_HOST,
        model_server_port: int = MODEL_SERVER_PORT,
        # Lean heavily towards not throwing out keywords
        keyword_percent_threshold: float = 0.1,
        # Lean towards semantic which is the default
        semantic_percent_threshold: float = 0.4,
    ) -> None:
        model_server_url = build_model_server_url(model_server_host, model_server_port)
        self.intent_server_endpoint = model_server_url + "/custom/query-analysis"
        self.keyword_percent_threshold = keyword_percent_threshold
        self.semantic_percent_threshold = semantic_percent_threshold

    def predict(
        self,
        query: str,
    ) -> tuple[bool, list[str]]:
        intent_request = IntentRequest(
            query=query,
            keyword_percent_threshold=self.keyword_percent_threshold,
            semantic_percent_threshold=self.semantic_percent_threshold,
        )

        response = requests.post(
            self.intent_server_endpoint, json=intent_request.model_dump()
        )
        response.raise_for_status()

        response_model = IntentResponse(**response.json())

        return response_model.is_keyword, response_model.keywords


class ConnectorClassificationModel:
    def __init__(
        self,
        model_server_host: str = MODEL_SERVER_HOST,
        model_server_port: int = MODEL_SERVER_PORT,
    ):
        model_server_url = build_model_server_url(model_server_host, model_server_port)
        self.connector_classification_endpoint = (
            model_server_url + "/custom/connector-classification"
        )

    def predict(
        self,
        query: str,
        available_connectors: list[str],
    ) -> list[str]:
        connector_classification_request = ConnectorClassificationRequest(
            available_connectors=available_connectors,
            query=query,
        )
        response = requests.post(
            self.connector_classification_endpoint,
            json=connector_classification_request.dict(),
        )
        response.raise_for_status()

        response_model = ConnectorClassificationResponse(**response.json())

        return response_model.connectors


def warm_up_retry(
    func: Callable[..., Any],
    tries: int = 20,
    delay: int = 5,
    *args: Any,
    **kwargs: Any,
) -> Callable[..., Any]:
    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        exceptions = []
        for attempt in range(tries):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                exceptions.append(e)
                logger.info(
                    f"Attempt {attempt + 1}/{tries} failed; retrying in {delay} seconds..."
                )
                time.sleep(delay)
        raise Exception(f"All retries failed: {exceptions}")

    return wrapper


def warm_up_bi_encoder(
    embedding_model: EmbeddingModel,
    non_blocking: bool = False,
) -> None:
    warm_up_str = " ".join(WARM_UP_STRINGS)

    logger.debug(f"Warming up encoder model: {embedding_model.model_name}")
    get_tokenizer(
        model_name=embedding_model.model_name,
        provider_type=embedding_model.provider_type,
    ).encode(warm_up_str)

    def _warm_up() -> None:
        try:
            embedding_model.encode(texts=[warm_up_str], text_type=EmbedTextType.QUERY)
            logger.debug(
                f"Warm-up complete for encoder model: {embedding_model.model_name}"
            )
        except Exception as e:
            logger.warning(
                f"Warm-up request failed for encoder model {embedding_model.model_name}: {e}"
            )

    if non_blocking:
        threading.Thread(target=_warm_up, daemon=True).start()
        logger.debug(
            f"Started non-blocking warm-up for encoder model: {embedding_model.model_name}"
        )
    else:
        retry_encode = warm_up_retry(embedding_model.encode)
        retry_encode(texts=[warm_up_str], text_type=EmbedTextType.QUERY)


def warm_up_cross_encoder(
    rerank_model_name: str,
    non_blocking: bool = False,
) -> None:
    logger.debug(f"Warming up reranking model: {rerank_model_name}")

    reranking_model = RerankingModel(
        model_name=rerank_model_name,
        provider_type=None,
        api_url=None,
        api_key=None,
    )

    def _warm_up() -> None:
        try:
            reranking_model.predict(WARM_UP_STRINGS[0], WARM_UP_STRINGS[1:])
            logger.debug(f"Warm-up complete for reranking model: {rerank_model_name}")
        except Exception as e:
            logger.warning(
                f"Warm-up request failed for reranking model {rerank_model_name}: {e}"
            )

    if non_blocking:
        threading.Thread(target=_warm_up, daemon=True).start()
        logger.debug(
            f"Started non-blocking warm-up for reranking model: {rerank_model_name}"
        )
    else:
        retry_rerank = warm_up_retry(reranking_model.predict)
        retry_rerank(WARM_UP_STRINGS[0], WARM_UP_STRINGS[1:])
