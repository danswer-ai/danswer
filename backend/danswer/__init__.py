import os
from enum import Enum

__version__ = os.environ.get("DANSWER_VERSION", "") or "0.3-dev"


# Define OpenAPI tags
class Tags(Enum):
    admin = "Admin"
    chat = "Chat"
    document = "Document"
    folder = "Folder"
    manage = "Manage"
    persona = "Persona"
    prompt = "Prompt"
    query = "Query"
    tool = "Tool"
    utility = "Utility"
