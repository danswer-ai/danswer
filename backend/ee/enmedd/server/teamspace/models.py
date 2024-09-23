from typing import List
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from enmedd.db.models import Teamspace as TeamspaceModel
from enmedd.server.documents.models import ConnectorCredentialPairDescriptor
from enmedd.server.documents.models import ConnectorSnapshot
from enmedd.server.documents.models import CredentialSnapshot
from enmedd.server.features.assistant.models import AssistantSnapshot
from enmedd.server.features.document_set.models import DocumentSet
from enmedd.server.manage.models import UserInfo
from enmedd.server.manage.models import UserPreferences
from enmedd.server.models import MinimalWorkspaceSnapshot
from enmedd.server.query_and_chat.models import ChatSessionDetails


class Teamspace(BaseModel):
    id: int
    name: str
    users: list[UserInfo]
    cc_pairs: list[ConnectorCredentialPairDescriptor]
    document_sets: list[DocumentSet]
    assistants: list[AssistantSnapshot]
    chat_sessions: list[ChatSessionDetails]
    is_up_to_date: bool
    is_up_for_deletion: bool
    workspace: list[MinimalWorkspaceSnapshot]

    @classmethod
    def from_model(cls, teamspace_model: TeamspaceModel) -> "Teamspace":
        return cls(
            id=teamspace_model.id,
            name=teamspace_model.name,
            users=[
                UserInfo(
                    id=str(user.id),
                    email=user.email,
                    is_active=user.is_active,
                    is_superuser=user.is_superuser,
                    is_verified=user.is_verified,
                    role=user.role,
                    preferences=UserPreferences(
                        chosen_assistants=user.chosen_assistants
                    ),
                    full_name=user.full_name,
                    company_name=user.company_name,
                    company_email=user.company_email,
                    company_billing=user.company_billing,
                    billing_email_address=user.billing_email_address,
                    vat=user.vat,
                )
                for user in teamspace_model.users
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
                for cc_pair_relationship in teamspace_model.cc_pair_relationships
                if cc_pair_relationship.is_current
            ],
            document_sets=[
                DocumentSet.from_model(ds) for ds in teamspace_model.document_sets
            ],
            assistants=[
                AssistantSnapshot.from_model(assistant)
                for assistant in teamspace_model.assistants
            ],
            chat_sessions=[
                ChatSessionDetails(
                    id=chat_session.id,
                    name=chat_session.description,
                    description=chat_session.description,
                    assistant_id=chat_session.assistant_id,
                    time_created=chat_session.time_created.isoformat(),
                    shared_status=chat_session.shared_status,
                    folder_id=chat_session.folder_id,
                    current_alternate_model=chat_session.current_alternate_model,
                )
                for chat_session in teamspace_model.chat_sessions
            ],
            is_up_to_date=teamspace_model.is_up_to_date,
            is_up_for_deletion=teamspace_model.is_up_for_deletion,
            workspace=[
                MinimalWorkspaceSnapshot(
                    id=workspace.id, workspace_name=workspace.workspace_name
                )
                for workspace in teamspace_model.workspace
            ],
        )


class TeamspaceCreate(BaseModel):
    name: str
    user_ids: list[UUID]
    cc_pair_ids: list[int]
    document_set_ids: Optional[List[int]] = []
    assistant_ids: Optional[List[int]] = []


class TeamspaceUpdate(BaseModel):
    user_ids: list[UUID]
    cc_pair_ids: list[int]
    document_set_ids: Optional[List[int]] = []
    assistant_ids: Optional[List[int]] = []
