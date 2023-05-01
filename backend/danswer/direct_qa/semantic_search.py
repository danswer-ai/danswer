import json
from typing import Any
from typing import List

import openai
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import NUM_RERANKED_RESULTS
from danswer.configs.app_configs import NUM_RETURNED_HITS
from danswer.configs.app_configs import OPENAI_API_KEY
from danswer.configs.model_configs import CROSS_EMBED_CONTEXT_SIZE
from danswer.configs.model_configs import CROSS_ENCODER_MODEL
from danswer.configs.model_configs import DOCUMENT_ENCODER_MODEL
from danswer.configs.model_configs import MODEL_CACHE_FOLDER
from danswer.configs.model_configs import QUERY_EMBEDDING_CONTEXT_SIZE
from danswer.datastores.interfaces import Datastore
from danswer.utils.logging import setup_logger
from danswer.utils.timing import build_timing_wrapper
from sentence_transformers import CrossEncoder  # type: ignore
from sentence_transformers import SentenceTransformer  # type: ignore


logger = setup_logger()

openai.api_key = OPENAI_API_KEY


embedding_model = SentenceTransformer(
    DOCUMENT_ENCODER_MODEL, cache_folder=MODEL_CACHE_FOLDER
)
embedding_model.max_seq_length = QUERY_EMBEDDING_CONTEXT_SIZE
cross_encoder = CrossEncoder(CROSS_ENCODER_MODEL)
cross_encoder.max_length = CROSS_EMBED_CONTEXT_SIZE


@build_timing_wrapper()
def semantic_reranking(
    query: str,
    chunks: List[InferenceChunk],
    filtered_result_set_size: int = NUM_RERANKED_RESULTS,
) -> List[InferenceChunk]:
    sim_scores = cross_encoder.predict([(query, chunk.content) for chunk in chunks])  # type: ignore
    scored_results = list(zip(sim_scores, chunks))
    scored_results.sort(key=lambda x: x[0], reverse=True)
    ranked_sim_scores, ranked_chunks = zip(*scored_results)

    logger.debug(
        f"Reranked similarity scores: {str(ranked_sim_scores[:filtered_result_set_size])}"
    )

    return ranked_chunks[:filtered_result_set_size]


def semantic_search(
    query: str,
    filters: dict[str, Any] | None,
    datastore: Datastore,
    num_hits: int = NUM_RETURNED_HITS,
    filtered_result_set_size: int = NUM_RERANKED_RESULTS,
) -> List[InferenceChunk] | None:
    top_chunks = datastore.semantic_retrieval(query, filters, num_hits)
    if not top_chunks:
        filters_log_msg = json.dumps(filters, separators=(",", ":")).replace("\n", "")
        logger.warning(
            f"Semantic search returned no results with filters: {filters_log_msg}"
        )
        return None
    ranked_chunks = semantic_reranking(query, top_chunks, filtered_result_set_size)
    return ranked_chunks
