import uuid
from collections.abc import Callable
from copy import deepcopy

from danswer.chunking.models import EmbeddedIndexChunk
from danswer.chunking.models import IndexChunk
from danswer.chunking.models import InferenceChunk
from danswer.configs.constants import ALLOWED_GROUPS
from danswer.configs.constants import ALLOWED_USERS


DEFAULT_BATCH_SIZE = 30


def get_uuid_from_chunk(
    chunk: IndexChunk | EmbeddedIndexChunk | InferenceChunk, mini_chunk_ind: int = 0
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


# Takes the chunk identifier returns whether the chunk exists and the user/group whitelists
WhitelistCallable = Callable[[str], tuple[bool, list[str], list[str]]]


def update_doc_user_map(
    chunk: IndexChunk | EmbeddedIndexChunk,
    doc_whitelist_map: dict[str, dict[str, list[str]]],
    doc_store_whitelist_fnc: WhitelistCallable,
    user_str: str,
) -> tuple[dict[str, dict[str, list[str]]], bool]:
    """Returns an updated document id to whitelists mapping and if the document's chunks need to be wiped."""
    doc_whitelist_map = deepcopy(doc_whitelist_map)
    first_chunk_uuid = str(get_uuid_from_chunk(chunk))
    document = chunk.source_document
    if document.id not in doc_whitelist_map:
        first_chunk_found, whitelist_users, whitelist_groups = doc_store_whitelist_fnc(
            first_chunk_uuid
        )

        if not first_chunk_found:
            doc_whitelist_map[document.id] = {
                ALLOWED_USERS: [user_str],
                # TODO introduce groups logic here
                ALLOWED_GROUPS: whitelist_groups,
            }
            # First chunk does not exist so document does not exist, no need for deletion
            return doc_whitelist_map, False
        else:
            if user_str not in whitelist_users:
                whitelist_users.append(user_str)
            # TODO introduce groups logic here
            doc_whitelist_map[document.id] = {
                ALLOWED_USERS: whitelist_users,
                ALLOWED_GROUPS: whitelist_groups,
            }
            # First chunk exists, but with update, there may be less total chunks now
            # Must delete rest of document chunks
            return doc_whitelist_map, True

    # If document is already in the mapping, don't delete again
    return doc_whitelist_map, False
