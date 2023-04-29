from enum import Enum

DOCUMENT_ID = "document_id"
CHUNK_ID = "chunk_id"
CONTENT = "content"
SOURCE_TYPE = "source_type"
SOURCE_LINKS = "source_links"
SOURCE_LINK = "link"
SECTION_CONTINUATION = "section_continuation"
ALLOWED_USERS = "allowed_users"
ALLOWED_GROUPS = "allowed_groups"


class DocumentSource(Enum):
    Slack = 1
    Web = 2
    GoogleDrive = 3
    Unknown = 4

    def __str__(self):
        return self.name

    def __int__(self):
        return self.value


WEB_SOURCE = "Web"
