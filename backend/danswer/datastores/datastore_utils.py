import math
import uuid
from collections.abc import Callable
from copy import deepcopy
from typing import TypeVar

from pydantic import BaseModel

from danswer.chunking.models import IndexChunk
from danswer.chunking.models import InferenceChunk
from danswer.configs.constants import PUBLIC_DOC_PAT
from danswer.connectors.models import IndexAttemptMetadata


DEFAULT_BATCH_SIZE = 30
BOOST_MULTIPLIER = 2  # Try to keep this consistent with Vespa


def translate_boost_count_to_multiplier(boost: int) -> float:
    # Sigmoid function, maxed out at BOOST_MULTIPLIER
    # 3 here stretches it out so we hit asymptote slower
    return BOOST_MULTIPLIER / (1 + math.exp(-1 * boost / 3))


def get_uuid_from_chunk(
    chunk: IndexChunk | InferenceChunk, mini_chunk_ind: int = 0
) -> uuid.UUID:
    doc_str = (
        chunk.document_id
        if isinstance(chunk, InferenceChunk)
        else chunk.source_document.id
    )
    # Web parsing URL duplicate catching
    if doc_str and doc_str[-1] == "/":
        doc_str = doc_str[:-1]
    unique_identifier_string = "_".join(
        [doc_str, str(chunk.chunk_id), str(mini_chunk_ind)]
    )
    return uuid.uuid5(uuid.NAMESPACE_X500, unique_identifier_string)


class CrossConnectorDocumentMetadata(BaseModel):
    """Represents metadata about a single document. This is needed since the
    `Document` class represents a document from a single connector, but that same
    document may be indexed by multiple connectors."""

    allowed_users: list[str]
    allowed_user_groups: list[str]
    already_in_index: bool


# Takes the chunk identifier returns the existing metaddata about that chunk
CrossConnectorDocumentMetadataFetchCallable = Callable[
    [str], CrossConnectorDocumentMetadata | None
]


T = TypeVar("T")


def _add_if_not_exists(obj_list: list[T], item: T) -> list[T]:
    if item in obj_list:
        return obj_list
    return obj_list + [item]


def update_cross_connector_document_metadata_map(
    chunk: IndexChunk,
    cross_connector_document_metadata_map: dict[str, CrossConnectorDocumentMetadata],
    doc_store_cross_connector_document_metadata_fetch_fn: CrossConnectorDocumentMetadataFetchCallable,
    index_attempt_metadata: IndexAttemptMetadata,
) -> tuple[dict[str, CrossConnectorDocumentMetadata], bool]:
    """Returns an updated document_id -> CrossConnectorDocumentMetadata map and
    if the document's chunks need to be wiped."""
    user_str = (
        PUBLIC_DOC_PAT
        if index_attempt_metadata.user_id is None
        else str(index_attempt_metadata.user_id)
    )

    cross_connector_document_metadata_map = deepcopy(
        cross_connector_document_metadata_map
    )
    first_chunk_uuid = str(get_uuid_from_chunk(chunk))
    document = chunk.source_document
    if document.id not in cross_connector_document_metadata_map:
        document_metadata_in_doc_store = (
            doc_store_cross_connector_document_metadata_fetch_fn(first_chunk_uuid)
        )

        if not document_metadata_in_doc_store:
            cross_connector_document_metadata_map[
                document.id
            ] = CrossConnectorDocumentMetadata(
                allowed_users=[user_str],
                allowed_user_groups=[],
                already_in_index=False,
            )
            # First chunk does not exist so document does not exist, no need for deletion
            return cross_connector_document_metadata_map, False
        else:
            # TODO introduce groups logic here
            cross_connector_document_metadata_map[
                document.id
            ] = CrossConnectorDocumentMetadata(
                allowed_users=_add_if_not_exists(
                    document_metadata_in_doc_store.allowed_users, user_str
                ),
                allowed_user_groups=document_metadata_in_doc_store.allowed_user_groups,
                already_in_index=True,
            )
            # First chunk exists, but with update, there may be less total chunks now
            # Must delete rest of document chunks
            return cross_connector_document_metadata_map, True

    existing_document_metadata = cross_connector_document_metadata_map[document.id]
    cross_connector_document_metadata_map[document.id] = CrossConnectorDocumentMetadata(
        allowed_users=_add_if_not_exists(
            existing_document_metadata.allowed_users, user_str
        ),
        allowed_user_groups=existing_document_metadata.allowed_user_groups,
        already_in_index=existing_document_metadata.already_in_index,
    )
    # If document is already in the mapping, don't delete again
    return cross_connector_document_metadata_map, False
