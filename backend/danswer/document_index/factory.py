from danswer.document_index.interfaces import DocumentIndex
from danswer.document_index.vespa.index import VespaIndex


def get_default_document_index(
    primary_index_name: str,
    secondary_index_name: str | None,
) -> DocumentIndex:
    """Primary index is the index that is used for querying/updating etc.
    Secondary index is for when both the currently used index and the upcoming
    index both need to be updated, updates are applied to both indices"""
    # Currently only supporting Vespa
    return VespaIndex(
        index_name=primary_index_name, secondary_index_name=secondary_index_name
    )
