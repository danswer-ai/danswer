import socket
from enum import auto
from enum import Enum

SOURCE_TYPE = "source_type"
# stored in the `metadata` of a chunk. Used to signify that this chunk should
# not be used for QA. For example, Google Drive file types which can't be parsed
# are still useful as a search result but not for QA.
IGNORE_FOR_QA = "ignore_for_qa"
# NOTE: deprecated, only used for porting key from old system
GEN_AI_API_KEY_STORAGE_KEY = "genai_api_key"
PUBLIC_DOC_PAT = "PUBLIC"
ID_SEPARATOR = ":;:"
DEFAULT_BOOST = 0
SESSION_KEY = "session"

# For chunking/processing chunks
RETURN_SEPARATOR = "\n\r\n"
SECTION_SEPARATOR = "\n\n"
# For combining attributes, doesn't have to be unique/perfect to work
INDEX_SEPARATOR = "==="

ENMEDD_METADATA_FILENAME = ".enmedd_metadata.json"

# Image quality
QUALITY = 50
SIZE = (200, 200)

# Messages
DISABLED_GEN_AI_MSG = (
    "Your System Admin has disabled the Generative AI functionalities of Arnold AI.\n"
    "Please contact them if you wish to have this enabled.\n"
    "You can still use Arnold AI as a search engine."
)

# Postgres connection constants for application_name
POSTGRES_WEB_APP_NAME = "web"
POSTGRES_INDEXER_APP_NAME = "indexer"
POSTGRES_CELERY_APP_NAME = "celery"
POSTGRES_CELERY_BEAT_APP_NAME = "celery_beat"
POSTGRES_CELERY_WORKER_PRIMARY_APP_NAME = "celery_worker_primary"
POSTGRES_CELERY_WORKER_LIGHT_APP_NAME = "celery_worker_light"
POSTGRES_CELERY_WORKER_HEAVY_APP_NAME = "celery_worker_heavy"
POSTGRES_PERMISSIONS_APP_NAME = "permissions"
POSTGRES_UNKNOWN_APP_NAME = "unknown"
POSTGRES_DEFAULT_SCHEMA = "public"

# API Keys
API_KEY_PREFIX = "API_KEY__"
API_KEY_DUMMY_EMAIL_DOMAIN = "enmeddapikey.ai"
UNNAMED_KEY_PLACEHOLDER = "Unnamed"

# Key-Value store keys
KV_REINDEX_KEY = "needs_reindexing"
KV_SEARCH_SETTINGS = "search_settings"
KV_UNSTRUCTURED_API_KEY = "unstructured_api_key"
KV_USER_STORE_KEY = "INVITED_USERS"
KV_NO_AUTH_USER_PREFERENCES_KEY = "no_auth_user_preferences"
KV_CRED_KEY = "credential_id_{}"
KV_GMAIL_CRED_KEY = "gmail_app_credential"
KV_GMAIL_SERVICE_ACCOUNT_KEY = "gmail_service_account_key"
KV_GOOGLE_DRIVE_CRED_KEY = "google_drive_app_credential"
KV_GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY = "google_drive_service_account_key"
KV_GEN_AI_KEY_CHECK_TIME = "genai_api_key_last_check_time"
KV_SETTINGS_KEY = "enmedd_settings"
KV_CUSTOMER_UUID_KEY = "customer_uuid"
KV_INSTANCE_DOMAIN_KEY = "instance_domain"
KV_ENTERPRISE_SETTINGS_KEY = "enmedd_enterprise_settings"
KV_CUSTOM_ANALYTICS_SCRIPT_KEY = "__custom_analytics_script__"

CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT = 60
CELERY_PRIMARY_WORKER_LOCK_TIMEOUT = 120


class DocumentSource(str, Enum):
    # Special case, document passed in via Arnold APIs without specifying a source type
    INGESTION_API = "ingestion_api"
    WEB = "web"
    GOOGLE_DRIVE = "google_drive"
    GMAIL = "gmail"
    GITHUB = "github"
    GITLAB = "gitlab"
    CONFLUENCE = "confluence"
    JIRA = "jira"
    PRODUCTBOARD = "productboard"
    FILE = "file"
    NOTION = "notion"
    HUBSPOT = "hubspot"
    GOOGLE_SITES = "google_sites"
    ZENDESK = "zendesk"
    DROPBOX = "dropbox"
    SHAREPOINT = "sharepoint"
    TEAMS = "teams"
    SALESFORCE = "salesforce"
    DISCOURSE = "discourse"
    AXERO = "axero"
    CLICKUP = "clickup"
    MEDIAWIKI = "mediawiki"
    WIKIPEDIA = "wikipedia"
    ASANA = "asana"
    S3 = "s3"
    R2 = "r2"
    GOOGLE_CLOUD_STORAGE = "google_cloud_storage"
    OCI_STORAGE = "oci_storage"
    XENFORO = "xenforo"
    NOT_APPLICABLE = "not_applicable"


class NotificationType(str, Enum):
    REINDEX = "reindex"


class BlobType(str, Enum):
    R2 = "r2"
    S3 = "s3"
    GOOGLE_CLOUD_STORAGE = "google_cloud_storage"
    OCI_STORAGE = "oci_storage"

    # Special case, for internet search
    NOT_APPLICABLE = "not_applicable"


class DocumentIndexType(str, Enum):
    COMBINED = "combined"  # Vespa
    SPLIT = "split"  # Typesense + Qdrant


class AuthType(str, Enum):
    DISABLED = "disabled"
    BASIC = "basic"
    GOOGLE_OAUTH = "google_oauth"
    OIDC = "oidc"
    SAML = "saml"


class SessionType(str, Enum):
    CHAT = "Chat"
    SEARCH = "Search"


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
    # System message is always constructed on the fly, not saved
    SYSTEM = "system"  # SystemMessage
    USER = "user"  # HumanMessage
    ASSISTANT = "assistant"  # AIMessage


class TokenRateLimitScope(str, Enum):
    USER = "user"
    TEAMSPACE = "teamspace"
    GLOBAL = "global"


class FileOrigin(str, Enum):
    CHAT_UPLOAD = "chat_upload"
    CHAT_IMAGE_GEN = "chat_image_gen"
    CONNECTOR = "connector"
    GENERATED_REPORT = "generated_report"
    OTHER = "other"


class PostgresAdvisoryLocks(Enum):
    KOMBU_MESSAGE_CLEANUP_LOCK_ID = auto()


class EnmeddCeleryQueues:
    VESPA_METADATA_SYNC = "vespa_metadata_sync"
    CONNECTOR_DELETION = "connector_deletion"
    CONNECTOR_PRUNING = "connector_pruning"


class EnmeddRedisLocks:
    PRIMARY_WORKER = "da_lock:primary_worker"
    CHECK_VESPA_SYNC_BEAT_LOCK = "da_lock:check_vespa_sync_beat"
    MONITOR_VESPA_SYNC_BEAT_LOCK = "da_lock:monitor_vespa_sync_beat"
    CHECK_CONNECTOR_DELETION_BEAT_LOCK = "da_lock:check_connector_deletion_beat"
    CHECK_PRUNE_BEAT_LOCK = "da_lock:check_prune_beat"


class EnmeddCeleryPriority(int, Enum):
    HIGHEST = 0
    HIGH = auto()
    MEDIUM = auto()
    LOW = auto()
    LOWEST = auto()


REDIS_SOCKET_KEEPALIVE_OPTIONS = {}
REDIS_SOCKET_KEEPALIVE_OPTIONS[socket.TCP_KEEPINTVL] = 15
REDIS_SOCKET_KEEPALIVE_OPTIONS[socket.TCP_KEEPCNT] = 3