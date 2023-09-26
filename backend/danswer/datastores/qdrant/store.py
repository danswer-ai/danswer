from uuid import UUID

from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import ResponseHandlingException
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.http.models import FieldCondition
from qdrant_client.http.models import Filter
from qdrant_client.http.models import MatchAny
from qdrant_client.http.models import MatchValue

from danswer.chunking.models import DocMetadataAwareIndexChunk
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import DOCUMENT_INDEX_NAME
from danswer.configs.app_configs import NUM_RETURNED_HITS
from danswer.configs.constants import ALLOWED_USERS
from danswer.configs.constants import DOCUMENT_ID
from danswer.configs.constants import PUBLIC_DOC_PAT
from danswer.configs.model_configs import SEARCH_DISTANCE_CUTOFF
from danswer.datastores.datastore_utils import get_uuid_from_chunk
from danswer.datastores.interfaces import DocumentInsertionRecord
from danswer.datastores.interfaces import IndexFilter
from danswer.datastores.interfaces import UpdateRequest
from danswer.datastores.interfaces import VectorIndex
from danswer.datastores.qdrant.indexing import index_qdrant_chunks
from danswer.datastores.qdrant.utils import create_qdrant_collection
from danswer.datastores.qdrant.utils import list_qdrant_collections
from danswer.search.semantic_search import embed_query
from danswer.utils.batching import batch_generator
from danswer.utils.clients import get_qdrant_client
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time

logger = setup_logger()

# how many points we want to delete/update at a time
_BATCH_SIZE = 200


def _build_qdrant_filters(
    user_id: UUID | None, filters: list[IndexFilter] | None
) -> list[FieldCondition]:
    filter_conditions: list[FieldCondition] = []
    # Permissions filter
    if user_id:
        filter_conditions.append(
            FieldCondition(
                key=ALLOWED_USERS,
                match=MatchAny(any=[str(user_id), PUBLIC_DOC_PAT]),
            )
        )
    else:
        filter_conditions.append(
            FieldCondition(
                key=ALLOWED_USERS,
                match=MatchValue(value=PUBLIC_DOC_PAT),
            )
        )

    # Provided query filters
    if filters:
        for filter_dict in filters:
            valid_filters = {
                key: value for key, value in filter_dict.items() if value is not None
            }
            for filter_key, filter_val in valid_filters.items():
                if isinstance(filter_val, str):
                    filter_conditions.append(
                        FieldCondition(
                            key=filter_key,
                            match=MatchValue(value=filter_val),
                        )
                    )
                elif isinstance(filter_val, list):
                    filter_conditions.append(
                        FieldCondition(
                            key=filter_key,
                            match=MatchAny(any=filter_val),
                        )
                    )
                else:
                    raise ValueError("Invalid filters provided")

    return filter_conditions


def _get_points_from_document_ids(
    document_ids: list[str],
    collection: str,
    client: QdrantClient,
) -> list[int | str]:
    offset: int | str | None = 0
    chunk_ids = []
    while offset is not None:
        matches, offset = client.scroll(
            collection_name=collection,
            scroll_filter=Filter(
                must=[FieldCondition(key=DOCUMENT_ID, match=MatchAny(any=document_ids))]
            ),
            limit=_BATCH_SIZE,
            with_payload=False,
            with_vectors=False,
            offset=offset,
        )
        for match in matches:
            chunk_ids.append(match.id)

    return chunk_ids


class QdrantIndex(VectorIndex):
    def __init__(self, index_name: str = DOCUMENT_INDEX_NAME) -> None:
        # In Qdrant, the vector index is referred to as a collection
        self.collection = index_name
        self.client = get_qdrant_client()

    def ensure_indices_exist(self) -> None:
        if self.collection not in {
            collection.name
            for collection in list_qdrant_collections(self.client).collections
        }:
            logger.info(f"Creating Qdrant collection with name: {self.collection}")
            create_qdrant_collection(
                collection_name=self.collection, q_client=self.client
            )

    def index(
        self,
        chunks: list[DocMetadataAwareIndexChunk],
    ) -> set[DocumentInsertionRecord]:
        return index_qdrant_chunks(
            chunks=chunks,
            collection=self.collection,
            client=self.client,
        )

    def update(self, update_requests: list[UpdateRequest]) -> None:
        logger.info(
            f"Updating {len(update_requests)} documents' allowed_users in Qdrant"
        )
        for update_request in update_requests:
            for doc_id_batch in batch_generator(
                items=update_request.document_ids,
                batch_size=_BATCH_SIZE,
            ):
                if update_request.access is None:
                    continue

                chunk_ids = _get_points_from_document_ids(
                    doc_id_batch, self.collection, self.client
                )
                self.client.set_payload(
                    collection_name=self.collection,
                    payload={ALLOWED_USERS: update_request.access.to_acl()},
                    points=chunk_ids,
                )

    def delete(self, doc_ids: list[str]) -> None:
        logger.info(f"Deleting {len(doc_ids)} documents from Qdrant")
        for doc_id_batch in batch_generator(items=doc_ids, batch_size=_BATCH_SIZE):
            chunk_ids = _get_points_from_document_ids(
                doc_id_batch, self.collection, self.client
            )
            self.client.delete(
                collection_name=self.collection,
                points_selector=chunk_ids,
            )

    @log_function_time()
    def semantic_retrieval(
        self,
        query: str,
        user_id: UUID | None,
        filters: list[IndexFilter] | None,
        num_to_retrieve: int = NUM_RETURNED_HITS,
        distance_cutoff: float | None = SEARCH_DISTANCE_CUTOFF,
        page_size: int = NUM_RETURNED_HITS,
    ) -> list[InferenceChunk]:
        query_embedding = embed_query(query)

        filter_conditions = _build_qdrant_filters(user_id, filters)

        page_offset = 0
        found_inference_chunks: list[InferenceChunk] = []
        found_chunk_uuids: set[UUID] = set()
        while len(found_inference_chunks) < num_to_retrieve:
            try:
                hits = self.client.search(
                    collection_name=self.collection,
                    query_vector=query_embedding,
                    query_filter=Filter(must=list(filter_conditions)),
                    limit=page_size,
                    offset=page_offset,
                    score_threshold=distance_cutoff,
                )
                page_offset += page_size
                if not hits:
                    break
            except ResponseHandlingException as e:
                logger.exception(
                    f'Qdrant querying failed due to: "{e}", is Qdrant set up?'
                )
                break
            except UnexpectedResponse as e:
                logger.exception(
                    f'Qdrant querying failed due to: "{e}", has ingestion been run?'
                )
                break

            inference_chunks_from_hits = [
                InferenceChunk.from_dict(hit.payload)
                for hit in hits
                if hit.payload is not None
            ]
            for inf_chunk in inference_chunks_from_hits:
                # remove duplicate chunks which happen if minichunks are used
                inf_chunk_id = get_uuid_from_chunk(inf_chunk)
                if inf_chunk_id not in found_chunk_uuids:
                    found_inference_chunks.append(inf_chunk)
                    found_chunk_uuids.add(inf_chunk_id)

        return found_inference_chunks
