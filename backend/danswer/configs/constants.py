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
EMBEDDINGS = "embeddings"
ALLOWED_USERS = "allowed_users"
ACCESS_CONTROL_LIST = "access_control_list"
DOCUMENT_SETS = "document_sets"
METADATA = "metadata"
MATCH_HIGHLIGHTS = "match_highlights"
# stored in the `metadata` of a chunk. Used to signify that this chunk should
# not be used for QA. For example, Google Drive file types which can't be parsed
# are still useful as a search result but not for QA.
IGNORE_FOR_QA = "ignore_for_qa"
GEN_AI_API_KEY_STORAGE_KEY = "genai_api_key"
PUBLIC_DOC_PAT = "PUBLIC"
PUBLIC_DOCUMENT_SET = "__PUBLIC"
QUOTE = "quote"
BOOST = "boost"
SCORE = "score"
ID_SEPARATOR = ":;:"
DEFAULT_BOOST = 0

# Prompt building constants:
GENERAL_SEP_PAT = "\n-----\n"
CODE_BLOCK_PAT = "\n```\n{}\n```\n"
DOC_SEP_PAT = "---NEW DOCUMENT---"
DOC_CONTENT_START_PAT = "DOCUMENT CONTENTS:\n"
QUESTION_PAT = "Query:"
THOUGHT_PAT = "Thought:"
ANSWER_PAT = "Answer:"
FINAL_ANSWER_PAT = "Final Answer:"
UNCERTAINTY_PAT = "?"
QUOTE_PAT = "Quote:"
QUOTES_PAT_PLURAL = "Quotes:"
INVALID_PAT = "Invalid:"


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
    ZULIP = "zulip"
    LINEAR = "linear"


class DocumentIndexType(str, Enum):
    COMBINED = "combined"  # Vespa
    SPLIT = "split"  # Typesense + Qdrant


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


class QAFeedbackType(str, Enum):
    LIKE = "like"  # User likes the answer, used for metrics
    DISLIKE = "dislike"  # User dislikes the answer, used for metrics


class SearchFeedbackType(str, Enum):
    ENDORSE = "endorse"  # boost this document for all future queries
    REJECT = "reject"  # down-boost this document for all future queries
    HIDE = "hide"  # mark this document as untrusted, hide from LLM
    UNHIDE = "unhide"


class MessageType(str, Enum):
    # Using OpenAI standards, Langchain equivalent shown in comment
    SYSTEM = "system"  # SystemMessage
    USER = "user"  # HumanMessage
    ASSISTANT = "assistant"  # AIMessage
    DANSWER = "danswer"  # FunctionMessage
