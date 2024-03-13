from danswer.configs.constants import CHUNK_PLATFORM_ALLOYDB
from danswer.document_index.interfaces import DocumentIndex
from danswer.document_index.vespa.index import VespaIndex
from danswer.configs.app_configs import CHUNK_DB_PLATFORM
from danswer.document_index.alloydb.index import PSQLIndex


def get_default_document_index(
        primary_index_name: str,
        secondary_index_name: str | None,
        platform: str | None
) -> DocumentIndex:
    """Primary index is the index that is used for querying/updating etc.
    Secondary index is for when both the currently used index and the upcoming
    index both need to be updated, updates are applied to both indices"""
    if platform is None:
        platform = CHUNK_DB_PLATFORM
    if platform == CHUNK_PLATFORM_ALLOYDB:
        from danswer.db.engine import get_sqlalchemy_engine
        return PSQLIndex(get_sqlalchemy_engine())
    return VespaIndex(
        index_name=primary_index_name, secondary_index_name=secondary_index_name
    )
