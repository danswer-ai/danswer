from danswer.document_index.interfaces import DocumentIndex
from danswer.document_index.vespa.index import VespaIndex


def get_default_document_index(
    primary_index_name: str | None = None,
    indices: list[str] | None = None,
    secondary_index_name: str | None = None
) -> DocumentIndex:
    """Primary index is the index that is used for querying/updating etc.
    Secondary index is for when both the currently used index and the upcoming
    index both need to be updated, updates are applied to both indices"""
    # Currently only supporting Vespa
    
    indices = [primary_index_name] if primary_index_name is not None else indices
    if not indices:
        raise ValueError("No indices provided")
    
    return VespaIndex(
        indices=indices,
        secondary_index_name=secondary_index_name
    )

