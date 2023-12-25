from fastapi import APIRouter
from fastapi import HTTPException

from danswer.configs.model_configs import CROSS_ENCODER_MODEL_ENSEMBLE
from danswer.configs.model_configs import DOCUMENT_ENCODER_MODEL
from danswer.configs.model_configs import NORMALIZE_EMBEDDINGS
from danswer.search.search_nlp_models import get_local_embedding_model
from danswer.search.search_nlp_models import get_local_reranking_model_ensemble
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time
from shared_models.model_server_models import EmbedRequest
from shared_models.model_server_models import EmbedResponse
from shared_models.model_server_models import RerankRequest
from shared_models.model_server_models import RerankResponse

logger = setup_logger()

WARM_UP_STRING = "Danswer is amazing"

router = APIRouter(prefix="/encoder")


@log_function_time(print_only=True)
def embed_text(
    texts: list[str],
    normalize_embeddings: bool = NORMALIZE_EMBEDDINGS,
) -> list[list[float]]:
    model = get_local_embedding_model()
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
        embeddings = embed_text(texts=embed_request.texts)
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


def warm_up_bi_encoder() -> None:
    logger.info(f"Warming up Bi-Encoders: {DOCUMENT_ENCODER_MODEL}")
    get_local_embedding_model().encode(WARM_UP_STRING)


def warm_up_cross_encoders() -> None:
    logger.info(f"Warming up Cross-Encoders: {CROSS_ENCODER_MODEL_ENSEMBLE}")

    cross_encoders = get_local_reranking_model_ensemble()
    [
        cross_encoder.predict((WARM_UP_STRING, WARM_UP_STRING))
        for cross_encoder in cross_encoders
    ]
