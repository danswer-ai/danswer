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
METADATA = "metadata"
GEN_AI_API_KEY_STORAGE_KEY = "genai_api_key"
HTML_SEPARATOR = "\n"
PUBLIC_DOC_PAT = "PUBLIC"


class DocumentSource(str, Enum):
    SLACK = "slack"
    WEB = "web"
    GOOGLE_DRIVE = "google_drive"
    GITHUB = "github"
    GURU = "guru"
    BOOKSTACK = "bookstack"
    CONFLUENCE = "confluence"
    SLAB = "slab"
    JIRA = "jira"
    PRODUCTBOARD = "productboard"
    FILE = "file"
    NOTION = "notion"


class DanswerGenAIModel(str, Enum):
    """This represents the internal Danswer GenAI model which determines the class that is used
    to generate responses to the user query. Different models/services require different internal
    handling, this allows for modularity of implementation within Danswer"""

    OPENAI = "openai-completion"
    OPENAI_CHAT = "openai-chat-completion"
    GPT4ALL = "gpt4all-completion"
    GPT4ALL_CHAT = "gpt4all-chat-completion"
    HUGGINGFACE = "huggingface-client-completion"
    HUGGINGFACE_CHAT = "huggingface-client-chat-completion"
    REQUEST = "request-completion"
    TRANSFORMERS = "transformers"


class ModelHostType(str, Enum):
    """For GenAI models interfaced via requests, different services have different
    expectations for what fields are included in the request"""

    # https://huggingface.co/docs/api-inference/detailed_parameters#text-generation-task
    HUGGINGFACE = "huggingface"  # HuggingFace test-generation Inference API
    # https://medium.com/@yuhongsun96/host-a-llama-2-api-on-gpu-for-free-a5311463c183
    COLAB_DEMO = "colab-demo"
    # TODO support for Azure, AWS, GCP GenAI model hosting
