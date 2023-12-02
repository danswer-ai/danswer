from pydantic import BaseModel

from danswer.db.models import DocumentSet as DocumentSetDBModel
from danswer.server.documents.models import ConnectorCredentialPairDescriptor
from danswer.server.documents.models import ConnectorSnapshot
from danswer.server.documents.models import CredentialSnapshot


class DocumentSetCreationRequest(BaseModel):
    name: str
    description: str
    cc_pair_ids: list[int]


class DocumentSetUpdateRequest(BaseModel):
    id: int
    description: str
    cc_pair_ids: list[int]


class CheckDocSetPublicRequest(BaseModel):
    document_set_ids: list[int]


class CheckDocSetPublicResponse(BaseModel):
    is_public: bool


class DocumentSet(BaseModel):
    id: int
    name: str
    description: str
    cc_pair_descriptors: list[ConnectorCredentialPairDescriptor]
    is_up_to_date: bool
    contains_non_public: bool

    @classmethod
    def from_model(cls, document_set_model: DocumentSetDBModel) -> "DocumentSet":
        return cls(
            id=document_set_model.id,
            name=document_set_model.name,
            description=document_set_model.description,
            contains_non_public=any(
                [
                    not cc_pair.is_public
                    for cc_pair in document_set_model.connector_credential_pairs
                ]
            ),
            cc_pair_descriptors=[
                ConnectorCredentialPairDescriptor(
                    id=cc_pair.id,
                    name=cc_pair.name,
                    connector=ConnectorSnapshot.from_connector_db_model(
                        cc_pair.connector
                    ),
                    credential=CredentialSnapshot.from_credential_db_model(
                        cc_pair.credential
                    ),
                )
                for cc_pair in document_set_model.connector_credential_pairs
            ],
            is_up_to_date=document_set_model.is_up_to_date,
        )
