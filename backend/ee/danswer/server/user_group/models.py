from uuid import UUID

from pydantic import BaseModel
from danswer.server.documents.models import (
    ConnectorCredentialPairDescriptor,
    ConnectorSnapshot,
    CredentialSnapshot,
)
from danswer.server.manage.models import UserInfo

from ee.danswer.db.models import UserGroup as UserGroupModel


class UserGroup(BaseModel):
    id: int
    name: str
    users: list[UserInfo]
    cc_pairs: list[ConnectorCredentialPairDescriptor]
    is_up_to_date: bool
    is_up_for_deletion: bool

    @classmethod
    def from_model(cls, document_set_model: UserGroupModel) -> "UserGroup":
        return cls(
            id=document_set_model.id,
            name=document_set_model.name,
            users=[
                UserInfo(
                    id=str(user.id),
                    email=user.email,
                    is_active=user.is_active,
                    is_superuser=user.is_superuser,
                    is_verified=user.is_verified,
                    role=user.role,
                )
                for user in document_set_model.users
            ],
            cc_pairs=[
                ConnectorCredentialPairDescriptor(
                    id=cc_pair_relationship.cc_pair.id,
                    name=cc_pair_relationship.cc_pair.name,
                    connector=ConnectorSnapshot.from_connector_db_model(
                        cc_pair_relationship.cc_pair.connector
                    ),
                    credential=CredentialSnapshot.from_credential_db_model(
                        cc_pair_relationship.cc_pair.credential
                    ),
                )
                for cc_pair_relationship in document_set_model.cc_pair_relationships
                if cc_pair_relationship.is_current
            ],
            is_up_to_date=document_set_model.is_up_to_date,
            is_up_for_deletion=document_set_model.is_up_for_deletion,
        )


class UserGroupCreate(BaseModel):
    name: str
    user_ids: list[UUID]
    cc_pair_ids: list[int]


class UserGroupUpdate(BaseModel):
    user_ids: list[UUID]
    cc_pair_ids: list[int]
