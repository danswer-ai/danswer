from danswer.chunking.models import IndexChunk
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import TYPESENSE_DEFAULT_COLLECTION
from danswer.configs.constants import ALLOWED_GROUPS
from danswer.configs.constants import ALLOWED_USERS
from danswer.configs.constants import CHUNK_ID
from danswer.configs.constants import CONTENT
from danswer.configs.constants import DOCUMENT_ID
from danswer.configs.constants import PUBLIC_DOC_PAT
from danswer.configs.constants import SECTION_CONTINUATION
from danswer.configs.constants import SEMANTIC_IDENTIFIER
from danswer.configs.constants import SOURCE_LINKS
from danswer.configs.constants import SOURCE_TYPE
from danswer.datastores.interfaces import IndexFilter
from danswer.datastores.interfaces import KeywordIndex
from danswer.utils.clients import get_typesense_client
from danswer.utils.logging import setup_logger
from typesense.exceptions import ObjectNotFound  # type: ignore


logger = setup_logger()


def check_typesense_collection_exist(
    collection_name: str = TYPESENSE_DEFAULT_COLLECTION,
) -> bool:
    client = get_typesense_client()
    try:
        client.collections[collection_name].retrieve()
    except ObjectNotFound:
        return False
    return True


def create_typesense_collection(
    collection_name: str = TYPESENSE_DEFAULT_COLLECTION,
) -> None:
    ts_client = get_typesense_client()
    collection_schema = {
        "name": collection_name,
        "fields": [
            {"name": DOCUMENT_ID, "type": "string"},
            {"name": CHUNK_ID, "type": "int32[]"},
            {"name": CONTENT, "type": "string"},
            {"name": SOURCE_TYPE, "type": "string"},
            {"name": SOURCE_LINKS, "type": "string[]"},
            {"name": SEMANTIC_IDENTIFIER, "type": "string"},
            {"name": SECTION_CONTINUATION, "type": "bool"},
            {"name": ALLOWED_USERS, "type": "string[]"},
            {"name": ALLOWED_GROUPS, "type": "string[]"},
        ],
    }
    ts_client.collections.create(collection_schema)


class TypesenseIndex(KeywordIndex):
    def __init__(self, collection: str = TYPESENSE_DEFAULT_COLLECTION) -> None:
        self.collection = collection
        self.client = get_typesense_client()

    def index(self, chunks: list[IndexChunk], user_id: int | None) -> bool:
        return False

    def keyword_search(
        self,
        query: str,
        user_id: int | None,
        filters: list[IndexFilter] | None,
        num_to_retrieve: int,
    ) -> list[InferenceChunk]:
        return []
