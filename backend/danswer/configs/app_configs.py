import os

from danswer.configs.constants import DocumentIndexType

#####
# App Configs
#####
APP_HOST = "0.0.0.0"
APP_PORT = 8080


#####
# User Facing Features Configs
#####
BLURB_SIZE = 128  # Number Encoder Tokens included in the chunk blurb
GENERATIVE_MODEL_ACCESS_CHECK_FREQ = 86400  # 1 day
# DISABLE_GENERATIVE_AI will turn of the question answering part of Danswer. Use this
# if you want to use Danswer as a search engine only and/or you are not comfortable sending
# anything to OpenAI. TODO: update this message once we support Azure / open source generative models.
DISABLE_GENERATIVE_AI = os.environ.get("DISABLE_GENERATIVE_AI", "").lower() == "true"

#####
# Web Configs
#####
# WEB_DOMAIN is used to set the redirect_uri when doing OAuth with Google
# TODO: investigate if this can be done cleaner by overwriting the redirect_uri
# on the frontend and just sending a dummy value (or completely generating the URL)
# on the frontend
WEB_DOMAIN = os.environ.get("WEB_DOMAIN", "http://localhost:3000")


#####
# Auth Configs
#####
DISABLE_AUTH = os.environ.get("DISABLE_AUTH", "").lower() == "true"
REQUIRE_EMAIL_VERIFICATION = (
    os.environ.get("REQUIRE_EMAIL_VERIFICATION", "").lower() == "true"
)
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "your-email@gmail.com")
SMTP_PASS = os.environ.get("SMTP_PASS", "your-gmail-password")

SECRET = os.environ.get("SECRET", "")
SESSION_EXPIRE_TIME_SECONDS = int(
    os.environ.get("SESSION_EXPIRE_TIME_SECONDS", 86400)
)  # 1 day

# set `VALID_EMAIL_DOMAINS` to a comma seperated list of domains in order to
# restrict access to Danswer to only users with emails from those domains.
# E.g. `VALID_EMAIL_DOMAINS=example.com,example.org` will restrict Danswer
# signups to users with either an @example.com or an @example.org email.
# NOTE: maintaining `VALID_EMAIL_DOMAIN` to keep backwards compatibility
_VALID_EMAIL_DOMAIN = os.environ.get("VALID_EMAIL_DOMAIN", "")
_VALID_EMAIL_DOMAINS_STR = (
    os.environ.get("VALID_EMAIL_DOMAINS", "") or _VALID_EMAIL_DOMAIN
)
VALID_EMAIL_DOMAINS = (
    [domain.strip() for domain in _VALID_EMAIL_DOMAINS_STR.split(",")]
    if _VALID_EMAIL_DOMAINS_STR
    else []
)

# OAuth Login Flow
ENABLE_OAUTH = os.environ.get("ENABLE_OAUTH", "").lower() != "false"
OAUTH_TYPE = os.environ.get("OAUTH_TYPE", "google").lower()
OAUTH_CLIENT_ID = os.environ.get(
    "OAUTH_CLIENT_ID", os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "")
)
OAUTH_CLIENT_SECRET = os.environ.get(
    "OAUTH_CLIENT_SECRET", os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET", "")
)
OPENID_CONFIG_URL = os.environ.get("OPENID_CONFIG_URL", "")
MASK_CREDENTIAL_PREFIX = (
    os.environ.get("MASK_CREDENTIAL_PREFIX", "True").lower() != "false"
)


#####
# DB Configs
#####
DOCUMENT_INDEX_NAME = "danswer_index"  # Shared by vector/keyword indices
# Vespa is now the default document index store for both keyword and vector
DOCUMENT_INDEX_TYPE = os.environ.get(
    "DOCUMENT_INDEX_TYPE", DocumentIndexType.COMBINED.value
)
VESPA_HOST = os.environ.get("VESPA_HOST") or "localhost"
VESPA_PORT = os.environ.get("VESPA_PORT") or "8081"
VESPA_TENANT_PORT = os.environ.get("VESPA_TENANT_PORT") or "19071"
# The default below is for dockerized deployment
VESPA_DEPLOYMENT_ZIP = (
    os.environ.get("VESPA_DEPLOYMENT_ZIP") or "/app/danswer/vespa-app.zip"
)
# Qdrant is Semantic Search Vector DB
# Url / Key are used to connect to a remote Qdrant instance
QDRANT_URL = os.environ.get("QDRANT_URL", "")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")
# Host / Port are used for connecting to local Qdrant instance
QDRANT_HOST = os.environ.get("QDRANT_HOST") or "localhost"
QDRANT_PORT = 6333
# Typesense is the Keyword Search Engine
TYPESENSE_HOST = os.environ.get("TYPESENSE_HOST") or "localhost"
TYPESENSE_PORT = 8108
TYPESENSE_API_KEY = os.environ.get("TYPESENSE_API_KEY", "")
# Number of documents in a batch during indexing (further batching done by chunks before passing to bi-encoder)
INDEX_BATCH_SIZE = 16

# below are intended to match the env variables names used by the official postgres docker image
# https://hub.docker.com/_/postgres
POSTGRES_USER = os.environ.get("POSTGRES_USER") or "postgres"
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD") or "password"
POSTGRES_HOST = os.environ.get("POSTGRES_HOST") or "localhost"
POSTGRES_PORT = os.environ.get("POSTGRES_PORT") or "5432"
POSTGRES_DB = os.environ.get("POSTGRES_DB") or "postgres"


#####
# Connector Configs
#####
GOOGLE_DRIVE_INCLUDE_SHARED = False
GOOGLE_DRIVE_FOLLOW_SHORTCUTS = False
FILE_CONNECTOR_TMP_STORAGE_PATH = os.environ.get(
    "FILE_CONNECTOR_TMP_STORAGE_PATH", "/home/file_connector_storage"
)
# TODO these should be available for frontend configuration, via advanced options expandable
WEB_CONNECTOR_IGNORED_CLASSES = os.environ.get(
    "WEB_CONNECTOR_IGNORED_CLASSES", "sidebar,footer"
).split(",")
WEB_CONNECTOR_IGNORED_ELEMENTS = os.environ.get(
    "WEB_CONNECTOR_IGNORED_ELEMENTS", "nav,footer,meta,script,style,symbol,aside"
).split(",")
WEB_CONNECTOR_OAUTH_CLIENT_ID = os.environ.get("WEB_CONNECTOR_OAUTH_CLIENT_ID")
WEB_CONNECTOR_OAUTH_CLIENT_SECRET = os.environ.get("WEB_CONNECTOR_OAUTH_CLIENT_SECRET")
WEB_CONNECTOR_OAUTH_TOKEN_URL = os.environ.get("WEB_CONNECTOR_OAUTH_TOKEN_URL")

NOTION_CONNECTOR_ENABLE_RECURSIVE_PAGE_LOOKUP = (
    os.environ.get("NOTION_CONNECTOR_ENABLE_RECURSIVE_PAGE_LOOKUP", "").lower()
    == "true"
)

#####
# Query Configs
#####
NUM_RETURNED_HITS = 50
NUM_RERANKED_RESULTS = 15
# We feed in document chunks until we reach this token limit.
# Default is ~5 full chunks (max chunk size is 2000 chars), although some chunks
# may be smaller which could result in passing in more total chunks
NUM_DOCUMENT_TOKENS_FED_TO_GENERATIVE_MODEL = int(
    os.environ.get("NUM_DOCUMENT_TOKENS_FED_TO_GENERATIVE_MODEL") or (512 * 5)
)
NUM_DOCUMENT_TOKENS_FED_TO_CHAT = int(
    os.environ.get("NUM_DOCUMENT_TOKENS_FED_TO_CHAT") or (512 * 3)
)
# 1 edit per 2 characters, currently unused due to fuzzy match being too slow
QUOTE_ALLOWED_ERROR_PERCENT = 0.05
QA_TIMEOUT = int(os.environ.get("QA_TIMEOUT") or "60")  # 60 seconds
# Include additional document/chunk metadata in prompt to GenerativeAI
INCLUDE_METADATA = False
HARD_DELETE_CHATS = os.environ.get("HARD_DELETE_CHATS", "True").lower() != "false"


#####
# Text Processing Configs
#####
CHUNK_SIZE = 512  # Tokens by embedding model
CHUNK_OVERLAP = int(CHUNK_SIZE * 0.05)  # 5% overlap
# More accurate results at the expense of indexing speed and index size (stores additional 4 MINI_CHUNK vectors)
ENABLE_MINI_CHUNK = os.environ.get("ENABLE_MINI_CHUNK", "").lower() == "true"
# Finer grained chunking for more detail retention
# Slightly larger since the sentence aware split is a max cutoff so most minichunks will be under MINI_CHUNK_SIZE
# tokens. But we need it to be at least as big as 1/4th chunk size to avoid having a tiny mini-chunk at the end
MINI_CHUNK_SIZE = 150


#####
# Encoder Model Endpoint Configs (Currently unused, running the models in memory)
#####
BI_ENCODER_HOST = "localhost"
BI_ENCODER_PORT = 9000
CROSS_ENCODER_HOST = "localhost"
CROSS_ENCODER_PORT = 9000


#####
# Miscellaneous
#####
PERSONAS_YAML = "./danswer/chat/personas.yaml"
DYNAMIC_CONFIG_STORE = os.environ.get(
    "DYNAMIC_CONFIG_STORE", "FileSystemBackedDynamicConfigStore"
)
DYNAMIC_CONFIG_DIR_PATH = os.environ.get("DYNAMIC_CONFIG_DIR_PATH", "/home/storage")
# notset, debug, info, warning, error, or critical
LOG_LEVEL = os.environ.get("LOG_LEVEL", "info")
# NOTE: Currently only supported in the Confluence and Google Drive connectors +
# only handles some failures (Confluence = handles API call failures, Google
# Drive = handles failures pulling files / parsing them)
CONTINUE_ON_CONNECTOR_FAILURE = os.environ.get(
    "CONTINUE_ON_CONNECTOR_FAILURE", ""
).lower() not in ["false", ""]
# Controls how many worker processes we spin up to index documents in the
# background. This is useful for speeding up indexing, but does require a
# fairly large amount of memory in order to increase substantially, since
# each worker loads the embedding models into memory.
NUM_INDEXING_WORKERS = int(os.environ.get("NUM_INDEXING_WORKERS") or 1)


#####
# Danswer Slack Bot Configs
#####
DANSWER_BOT_NUM_DOCS_TO_DISPLAY = int(
    os.environ.get("DANSWER_BOT_NUM_DOCS_TO_DISPLAY", "5")
)
DANSWER_BOT_NUM_RETRIES = int(os.environ.get("DANSWER_BOT_NUM_RETRIES", "5"))
DANSWER_BOT_ANSWER_GENERATION_TIMEOUT = int(
    os.environ.get("DANSWER_BOT_ANSWER_GENERATION_TIMEOUT", "90")
)
DANSWER_BOT_DISPLAY_ERROR_MSGS = os.environ.get(
    "DANSWER_BOT_DISPLAY_ERROR_MSGS", ""
).lower() not in [
    "false",
    "",
]
DANSWER_BOT_DISABLE_DOCS_ONLY_ANSWER = os.environ.get(
    "DANSWER_BOT_DISABLE_DOCS_ONLY_ANSWER", ""
).lower() not in ["false", ""]
# Add a second LLM call post Answer to verify if the Answer is valid
# Throws out answers that don't directly or fully answer the user query
ENABLE_DANSWERBOT_REFLEXION = (
    os.environ.get("ENABLE_DANSWERBOT_REFLEXION", "").lower() == "true"
)
ENABLE_SLACK_DOC_FEEDBACK = (
    os.environ.get("ENABLE_SLACK_DOC_FEEDBACK", "").lower() == "true"
)
