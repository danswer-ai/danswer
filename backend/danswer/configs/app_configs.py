import os

from danswer.configs.constants import AuthType
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
# DISABLE_GENERATIVE_AI will turn of the question answering part of Danswer.
# Use this if you want to use Danswer as a search engine only without the LLM capabilities
DISABLE_GENERATIVE_AI = os.environ.get("DISABLE_GENERATIVE_AI", "").lower() == "true"


#####
# Web Configs
#####
# WEB_DOMAIN is used to set the redirect_uri after login flows
WEB_DOMAIN = os.environ.get("WEB_DOMAIN") or "http://localhost:3000"


#####
# Auth Configs
#####
AUTH_TYPE = AuthType((os.environ.get("AUTH_TYPE") or AuthType.DISABLED.value).lower())
DISABLE_AUTH = AUTH_TYPE == AuthType.DISABLED

# Turn off mask if admin users should see full credentials for data connectors.
MASK_CREDENTIAL_PREFIX = (
    os.environ.get("MASK_CREDENTIAL_PREFIX", "True").lower() != "false"
)

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
# Used for both Google OAuth2 and OIDC flows
OAUTH_CLIENT_ID = (
    os.environ.get("OAUTH_CLIENT_ID", os.environ.get("GOOGLE_OAUTH_CLIENT_ID")) or ""
)
OAUTH_CLIENT_SECRET = (
    os.environ.get("OAUTH_CLIENT_SECRET", os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET"))
    or ""
)

# The following Basic Auth configs are not supported by the frontend UI
REQUIRE_EMAIL_VERIFICATION = (
    os.environ.get("REQUIRE_EMAIL_VERIFICATION", "").lower() == "true"
)
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "your-email@gmail.com")
SMTP_PASS = os.environ.get("SMTP_PASS", "your-gmail-password")


#####
# DB Configs
#####
DOCUMENT_INDEX_NAME = "danswer_index"
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
# Number of documents in a batch during indexing (further batching done by chunks before passing to bi-encoder)
INDEX_BATCH_SIZE = 16

# Below are intended to match the env variables names used by the official postgres docker image
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

CONFLUENCE_CONNECTOR_LABELS_TO_SKIP = [
    ignored_tag
    for ignored_tag in os.environ.get("CONFLUENCE_CONNECTOR_LABELS_TO_SKIP", "").split(
        ","
    )
    if ignored_tag
]

GONG_CONNECTOR_START_TIME = os.environ.get("GONG_CONNECTOR_START_TIME")

DASK_JOB_CLIENT_ENABLED = (
    os.environ.get("DASK_JOB_CLIENT_ENABLED", "").lower() == "true"
)
EXPERIMENTAL_CHECKPOINTING_ENABLED = (
    os.environ.get("EXPERIMENTAL_CHECKPOINTING_ENABLED", "").lower() == "true"
)

#####
# Indexing Configs
#####
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
CHUNK_SIZE = 512  # Tokens by embedding model
CHUNK_OVERLAP = int(CHUNK_SIZE * 0.05)  # 5% overlap
# More accurate results at the expense of indexing speed and index size (stores additional 4 MINI_CHUNK vectors)
ENABLE_MINI_CHUNK = os.environ.get("ENABLE_MINI_CHUNK", "").lower() == "true"
# Finer grained chunking for more detail retention
# Slightly larger since the sentence aware split is a max cutoff so most minichunks will be under MINI_CHUNK_SIZE
# tokens. But we need it to be at least as big as 1/4th chunk size to avoid having a tiny mini-chunk at the end
MINI_CHUNK_SIZE = 150


#####
# Query Configs
#####
NUM_RETURNED_HITS = 50
NUM_RERANKED_RESULTS = 15
# We feed in document chunks until we reach this token limit.
# Default is ~5 full chunks (max chunk size is 2000 chars), although some chunks may be
# significantly smaller which could result in passing in more total chunks.
# There is also a slight bit of overhead, not accounted for here such as separator patterns
# between the docs, metadata for the docs, etc.
# Finally, this is combined with the rest of the QA prompt, so don't set this too close to the
# model token limit
NUM_DOCUMENT_TOKENS_FED_TO_GENERATIVE_MODEL = int(
    os.environ.get("NUM_DOCUMENT_TOKENS_FED_TO_GENERATIVE_MODEL") or (512 * 5)
)
NUM_DOCUMENT_TOKENS_FED_TO_CHAT = int(
    os.environ.get("NUM_DOCUMENT_TOKENS_FED_TO_CHAT") or (512 * 3)
)
# For selecting a different LLM question-answering prompt format
# Valid values: default, cot, weak
QA_PROMPT_OVERRIDE = os.environ.get("QA_PROMPT_OVERRIDE") or None
# 1 / (1 + DOC_TIME_DECAY * doc-age-in-years), set to 0 to have no decay
# Capped in Vespa at 0.5
DOC_TIME_DECAY = float(
    os.environ.get("DOC_TIME_DECAY") or 0.5  # Hits limit at 2 years by default
)
FAVOR_RECENT_DECAY_MULTIPLIER = 2
DISABLE_LLM_FILTER_EXTRACTION = (
    os.environ.get("DISABLE_LLM_FILTER_EXTRACTION", "").lower() == "true"
)
DISABLE_LLM_CHUNK_FILTER = (
    os.environ.get("DISABLE_LLM_CHUNK_FILTER", "").lower() == "true"
)
# 1 edit per 20 characters, currently unused due to fuzzy match being too slow
QUOTE_ALLOWED_ERROR_PERCENT = 0.05
QA_TIMEOUT = int(os.environ.get("QA_TIMEOUT") or "60")  # 60 seconds
# Include additional document/chunk metadata in prompt to GenerativeAI
INCLUDE_METADATA = False
# Keyword Search Drop Stopwords
# If user has changed the default model, would most likely be to use a multilingual
# model, the stopwords are NLTK english stopwords so then we would want to not drop the keywords
if os.environ.get("EDIT_KEYWORD_QUERY"):
    EDIT_KEYWORD_QUERY = os.environ.get("EDIT_KEYWORD_QUERY", "").lower() == "true"
else:
    EDIT_KEYWORD_QUERY = not os.environ.get("DOCUMENT_ENCODER_MODEL")
# Weighting factor between Vector and Keyword Search, 1 for completely vector search
HYBRID_ALPHA = max(0, min(1, float(os.environ.get("HYBRID_ALPHA") or 0.6)))
# A list of languages passed to the LLM to rephase the query
# For example "English,French,Spanish", be sure to use the "," separator
MULTILINGUAL_QUERY_EXPANSION = os.environ.get("MULTILINGUAL_QUERY_EXPANSION") or None

#####
# Model Server Configs
#####
# If MODEL_SERVER_HOST is set, the NLP models required for Danswer are offloaded to the server via
# requests. Be sure to include the scheme in the MODEL_SERVER_HOST value.
MODEL_SERVER_HOST = os.environ.get("MODEL_SERVER_HOST") or None
MODEL_SERVER_ALLOWED_HOST = os.environ.get("MODEL_SERVER_HOST") or "0.0.0.0"
MODEL_SERVER_PORT = int(os.environ.get("MODEL_SERVER_PORT") or "9000")

EMBEDDING_MODEL_SERVER_HOST = (
    os.environ.get("EMBEDDING_MODEL_SERVER_HOST") or MODEL_SERVER_HOST
)
CROSS_ENCODER_MODEL_SERVER_HOST = (
    os.environ.get("CROSS_ENCODER_MODEL_SERVER_HOST") or MODEL_SERVER_HOST
)
INTENT_MODEL_SERVER_HOST = (
    os.environ.get("INTENT_MODEL_SERVER_HOST") or MODEL_SERVER_HOST
)

# specify this env variable directly to have a different model server for the background
# indexing job vs the api server so that background indexing does not effect query-time
# performance
BACKGROUND_JOB_EMBEDDING_MODEL_SERVER_HOST = (
    os.environ.get("BACKGROUND_JOB_EMBEDDING_MODEL_SERVER_HOST")
    or EMBEDDING_MODEL_SERVER_HOST
)


#####
# Miscellaneous
#####
PERSONAS_YAML = "./danswer/chat/personas.yaml"
DYNAMIC_CONFIG_STORE = os.environ.get(
    "DYNAMIC_CONFIG_STORE", "FileSystemBackedDynamicConfigStore"
)
DYNAMIC_CONFIG_DIR_PATH = os.environ.get("DYNAMIC_CONFIG_DIR_PATH", "/home/storage")
JOB_TIMEOUT = 60 * 60 * 6  # 6 hours default
# used to allow the background indexing jobs to use a different embedding
# model server than the API server
CURRENT_PROCESS_IS_AN_INDEXING_JOB = (
    os.environ.get("CURRENT_PROCESS_IS_AN_INDEXING_JOB", "").lower() == "true"
)
# Logs every model prompt and output, mostly used for development or exploration purposes
LOG_ALL_MODEL_INTERACTIONS = (
    os.environ.get("LOG_ALL_MODEL_INTERACTIONS", "").lower() == "true"
)
# If set to `true` will enable additional logs about Vespa query performance
# (time spent on finding the right docs + time spent fetching summaries from disk)
LOG_VESPA_TIMING_INFORMATION = (
    os.environ.get("LOG_VESPA_TIMING_INFORMATION", "").lower() == "true"
)
# Anonymous usage telemetry
DISABLE_TELEMETRY = os.environ.get("DISABLE_TELEMETRY", "").lower() == "true"
# notset, debug, info, warning, error, or critical
LOG_LEVEL = os.environ.get("LOG_LEVEL", "info")
