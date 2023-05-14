from enum import Enum

DOCUMENT_ID = "document_id"
CHUNK_ID = "chunk_id"
BLURB = "blurb"
CONTENT = "content"
SOURCE_TYPE = "source_type"
SOURCE_LINKS = "source_links"
SOURCE_LINK = "link"
SEMANTIC_IDENTIFIER = "semantic_identifier"
SECTION_CONTINUATION = "section_continuation"
ALLOWED_USERS = "allowed_users"
ALLOWED_GROUPS = "allowed_groups"
NO_AUTH_USER = "FooBarUser"  # TODO rework this temporary solution


class DocumentSource(str, Enum):
    SLACK = "slack"
    WEB = "web"
    GOOGLE_DRIVE = "google_drive"
    GITHUB = "github"
