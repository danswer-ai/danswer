from pydantic import BaseModel

from danswer.configs.constants import DocumentSource


class GroupDefinition(BaseModel):
    external_id: str
    user_emails: list[str]
    source: DocumentSource


class ExternalUserDefinition(BaseModel):
    external_id: str
    user_email: str
    source: DocumentSource


class GroupSyncRes(BaseModel):
    group_defs: list[GroupDefinition]
    user_ext_cache_update: list[ExternalUserDefinition]
