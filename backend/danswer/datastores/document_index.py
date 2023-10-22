from danswer.datastores.interfaces import DocumentIndex
from danswer.datastores.vespa.store import VespaIndex
from danswer.utils.logger import setup_logger

logger = setup_logger()


def get_default_document_index() -> DocumentIndex:
    # Currently only supporting Vespa
    # Supporting multiple index types with multiple
    # Search-Engines / VectorDBs was too much overhead
    return VespaIndex()
