from typing import TYPE_CHECKING

from fastapi import APIRouter
from fastapi import HTTPException

from danswer.configs.model_configs import CROSS_ENCODER_MODEL_ENSEMBLE
from danswer.configs.model_configs import DOC_EMBEDDING_CONTEXT_SIZE
from danswer.search.search_nlp_models import get_local_reranking_model_ensemble
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time
from shared_models.model_server_models import EmbedRequest
from shared_models.model_server_models import EmbedResponse
from shared_models.model_server_models import RerankRequest
from shared_models.model_server_models import RerankResponse

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer  # type: ignore


logger = setup_logger()

WARM_UP_STRING = "Danswer is amazing"

router = APIRouter(prefix="/encoder")

_GLOBAL_MODELS_DICT: dict[str, "SentenceTransformer"] = {}


def get_embedding_model(
    model_name: str,
    max_context_length: int = DOC_EMBEDDING_CONTEXT_SIZE,
) -> "SentenceTransformer":
    from sentence_transformers import SentenceTransformer  # type: ignore

    global _GLOBAL_MODELS_DICT  # A dictionary to store models

    if _GLOBAL_MODELS_DICT is None:
        _GLOBAL_MODELS_DICT = {}

    if model_name not in _GLOBAL_MODELS_DICT:
        logger.info(f"Loading {model_name}")
        model = SentenceTransformer(model_name)
        model.max_seq_length = max_context_length
        _GLOBAL_MODELS_DICT[model_name] = model
    elif max_context_length != _GLOBAL_MODELS_DICT[model_name].max_seq_length:
        _GLOBAL_MODELS_DICT[model_name].max_seq_length = max_context_length

    return _GLOBAL_MODELS_DICT[model_name]


@log_function_time(print_only=True)
def embed_text(
    texts: list[str], model_name: str, normalize_embeddings: bool
) -> list[list[float]]:
    model = get_embedding_model(model_name=model_name)
    embeddings = model.encode(texts, normalize_embeddings=normalize_embeddings)

    if not isinstance(embeddings, list):
        embeddings = embeddings.tolist()

    return embeddings


@log_function_time(print_only=True)
def calc_sim_scores(query: str, docs: list[str]) -> list[list[float]]:
    cross_encoders = get_local_reranking_model_ensemble()
    sim_scores = [
        encoder.predict([(query, doc) for doc in docs]).tolist()  # type: ignore
        for encoder in cross_encoders
    ]
    return sim_scores


@router.post("/bi-encoder-embed")
def process_embed_request(
    embed_request: EmbedRequest,
) -> EmbedResponse:
    try:
        embeddings = embed_text(
            texts=embed_request.texts,
            model_name=embed_request.model_name,
            normalize_embeddings=embed_request.normalize_embeddings,
        )
        return EmbedResponse(embeddings=embeddings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cross-encoder-scores")
def process_rerank_request(embed_request: RerankRequest) -> RerankResponse:
    try:
        sim_scores = calc_sim_scores(
            query=embed_request.query, docs=embed_request.documents
        )
        return RerankResponse(scores=sim_scores)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def warm_up_cross_encoders() -> None:
    logger.info(f"Warming up Cross-Encoders: {CROSS_ENCODER_MODEL_ENSEMBLE}")

    cross_encoders = get_local_reranking_model_ensemble()
    [
        cross_encoder.predict((WARM_UP_STRING, WARM_UP_STRING))
        for cross_encoder in cross_encoders
    ]
