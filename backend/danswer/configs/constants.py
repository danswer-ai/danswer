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
    HUGGINGFACE = "huggingface-inference-completion"
    HUGGINGFACE_CHAT = "huggingface-inference-chat-completion"
    REQUEST = "request-completion"


class VerifiedModels(str, Enum):
    """Other models should work as well, check the library/API compatibility.
    But these are the models that have been verified to work with the existing prompts.
    Using a different model may require some prompt tuning. See qa_prompts.py"""

    GPT3 = "gpt-3.5-turbo"  # openai-chat-completion
    GPT4 = "gpt-4"  # openai-chat-completion
    DAVINCI = "text-davinci-003"  # openai-completion
    # Note the Falcon model does not follow the prompt very well, often not using information in
    # the reference documents and also very rarely does it provide quotes
    FALCON = "ggml-model-gpt4all-falcon-q4_0.bin"  # GPT4All completion/chat-completion
    LLAMA = "meta-llama/Llama-2-70b-chat-hf"  # HuggingFace


class ModelHostType(str, Enum):
    """For GenAI models interfaced via requests, different services have different
    expectations for what fields are included in the request"""

    # https://huggingface.co/docs/api-inference/detailed_parameters#text-generation-task
    HUGGINGFACE = "huggingface"  # HuggingFace test-generation Inference API
    # TODO support for Azure, AWS, GCP GenAI model hosting
