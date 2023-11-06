from fastapi import APIRouter
from fastapi import HTTPException

from danswer.configs.model_configs import CROSS_ENCODER_MODEL_ENSEMBLE
from danswer.configs.model_configs import DOCUMENT_ENCODER_MODEL
from danswer.configs.model_configs import NORMALIZE_EMBEDDINGS
from danswer.search.search_nlp_models import get_local_embedding_model
from danswer.search.search_nlp_models import get_local_reranking_model_ensemble
from danswer.utils.logger import setup_logger
from model_server.models import EmbedRequest
from model_server.models import EmbedResponse
from model_server.models import RerankRequest
from model_server.models import RerankResponse

logger = setup_logger()

WARM_UP_STRING = "Danswer is amazing"

router = APIRouter(prefix="/encoder")


@router.post("/bi-encoder-embed")
def embed_text(
    embed_request: EmbedRequest,
    normalize_embeddings: bool = NORMALIZE_EMBEDDINGS,
) -> EmbedResponse:
    try:
        model = get_local_embedding_model()
        embeddings = model.encode(
            embed_request.texts, normalize_embeddings=normalize_embeddings
        )

        if not isinstance(embeddings, list):
            embeddings = embeddings.tolist()

        return EmbedResponse(embeddings=embeddings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cross-encoder-scores")
def score_relevance(embed_request: RerankRequest) -> RerankResponse:
    query = embed_request.query
    docs = embed_request.documents
    try:
        cross_encoders = get_local_reranking_model_ensemble()
        sim_scores = [
            encoder.predict([(query, doc) for doc in docs]).tolist()  # type: ignore
            for encoder in cross_encoders
        ]

        return RerankResponse(scores=sim_scores)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def warm_up_bi_encoder() -> None:
    logger.info(f"Running Bi-Encoders: {DOCUMENT_ENCODER_MODEL}")
    get_local_embedding_model().encode(WARM_UP_STRING)


def warm_up_cross_encoders() -> None:
    logger.info(f"Running Cross-Encoders: {CROSS_ENCODER_MODEL_ENSEMBLE}")

    cross_encoders = get_local_reranking_model_ensemble()
    [
        cross_encoder.predict((WARM_UP_STRING, WARM_UP_STRING))
        for cross_encoder in cross_encoders
    ]
