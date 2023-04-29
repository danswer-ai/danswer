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
from danswer.utils.clients import get_qdrant_client
from danswer.utils.logging import setup_logger
from danswer.utils.timing import build_timing_wrapper
from qdrant_client.http.exceptions import ResponseHandlingException
from qdrant_client.http.exceptions import UnexpectedResponse
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
def semantic_retrival(
    qdrant_collection: str,
    query: str,
    num_hits: int = NUM_RETURNED_HITS,
    use_openai: bool = False,
) -> List[InferenceChunk]:
    if use_openai:
        query_embedding = openai.Embedding.create(
            input=query, model="text-embedding-ada-002"
        )["data"][0]["embedding"]
    else:
        query_embedding = embedding_model.encode(query)
    try:
        hits = get_qdrant_client().search(
            collection_name=qdrant_collection,
            query_vector=query_embedding
            if isinstance(query_embedding, list)
            else query_embedding.tolist(),
            query_filter=None,
            limit=num_hits,
        )
    except ResponseHandlingException as e:
        logger.exception(f'Qdrant querying failed due to: "{e}", is Qdrant set up?')
    except UnexpectedResponse as e:
        logger.exception(
            f'Qdrant querying failed due to: "{e}", has ingestion been run?'
        )

    retrieved_chunks = []
    for hit in hits:
        payload = hit.payload
        retrieved_chunks.append(InferenceChunk.from_dict(payload))

    return retrieved_chunks


@build_timing_wrapper()
def semantic_reranking(
    query: str,
    chunks: List[InferenceChunk],
    filtered_result_set_size: int = NUM_RERANKED_RESULTS,
) -> List[InferenceChunk]:
    sim_scores = cross_encoder.predict([(query, chunk.content) for chunk in chunks])
    scored_results = list(zip(sim_scores, chunks))
    scored_results.sort(key=lambda x: x[0], reverse=True)
    ranked_sim_scores, ranked_chunks = zip(*scored_results)

    logger.debug(
        f"Reranked similarity scores: {str(ranked_sim_scores[:filtered_result_set_size])}"
    )

    return ranked_chunks[:filtered_result_set_size]


def semantic_search(
    qdrant_collection: str,
    query: str,
    num_hits: int = NUM_RETURNED_HITS,
    filtered_result_set_size: int = NUM_RERANKED_RESULTS,
) -> List[InferenceChunk]:
    top_chunks = semantic_retrival(qdrant_collection, query, num_hits)
    ranked_chunks = semantic_reranking(query, top_chunks, filtered_result_set_size)
    return ranked_chunks
