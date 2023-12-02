from pydantic import BaseModel

from danswer.connectors.models import DocumentBase


class IngestionDocument(BaseModel):
    document: DocumentBase
    connector_id: int | None = None  # Takes precedence over the name
    connector_name: str | None = None
    credential_id: int | None = None
    create_connector: bool = False  # Currently not allowed
    public_doc: bool = True  # To attach to the cc_pair, currently unused


class IngestionResult(BaseModel):
    document_id: str
    already_existed: bool
