import json
import os
import urllib.parse

from danswer.configs.constants import AuthType
from danswer.configs.constants import DocumentIndexType
from danswer.file_processing.enums import HtmlBasedConnectorTransformLinksStrategy

#####
# App Configs
#####
APP_HOST = "0.0.0.0"
APP_PORT = 8080
# API_PREFIX is used to prepend a base path for all API routes
# generally used if using a reverse proxy which doesn't support stripping the `/api`
# prefix from requests directed towards the API server. In these cases, set this to `/api`
APP_API_PREFIX = os.environ.get("API_PREFIX", "")


#####
# User Facing Features Configs
#####
BLURB_SIZE = 128  # Number Encoder Tokens included in the chunk blurb
GENERATIVE_MODEL_ACCESS_CHECK_FREQ = int(
    os.environ.get("GENERATIVE_MODEL_ACCESS_CHECK_FREQ") or 86400
)  # 1 day
DISABLE_GENERATIVE_AI = os.environ.get("DISABLE_GENERATIVE_AI", "").lower() == "true"


#####
# Web Configs
#####
# WEB_DOMAIN is used to set the redirect_uri after login flows
# NOTE: if you are having problems accessing the Danswer web UI locally (especially
# on Windows, try  setting this to `http://127.0.0.1:3000` instead and see if that
# fixes it)
WEB_DOMAIN = os.environ.get("WEB_DOMAIN") or "http://localhost:3000"


#####
# Auth Configs
#####
AUTH_TYPE = AuthType((os.environ.get("AUTH_TYPE") or AuthType.DISABLED.value).lower())
DISABLE_AUTH = AUTH_TYPE == AuthType.DISABLED

# Encryption key secret is used to encrypt connector credentials, api keys, and other sensitive
# information. This provides an extra layer of security on top of Postgres access controls
# and is available in Danswer EE
ENCRYPTION_KEY_SECRET = os.environ.get("ENCRYPTION_KEY_SECRET") or ""

# Turn off mask if admin users should see full credentials for data connectors.
MASK_CREDENTIAL_PREFIX = (
    os.environ.get("MASK_CREDENTIAL_PREFIX", "True").lower() != "false"
)

SESSION_EXPIRE_TIME_SECONDS = int(
    os.environ.get("SESSION_EXPIRE_TIME_SECONDS") or 86400 * 7
)  # 7 days

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

USER_AUTH_SECRET = os.environ.get("USER_AUTH_SECRET", "")

# for basic auth
REQUIRE_EMAIL_VERIFICATION = (
    os.environ.get("REQUIRE_EMAIL_VERIFICATION", "").lower() == "true"
)
SMTP_SERVER = os.environ.get("SMTP_SERVER") or "smtp.gmail.com"
SMTP_PORT = int(os.environ.get("SMTP_PORT") or "587")
SMTP_USER = os.environ.get("SMTP_USER", "your-email@gmail.com")
SMTP_PASS = os.environ.get("SMTP_PASS", "your-gmail-password")
EMAIL_FROM = os.environ.get("EMAIL_FROM") or SMTP_USER

# If set, Danswer will listen to the `expires_at` returned by the identity
# provider (e.g. Okta, Google, etc.) and force the user to re-authenticate
# after this time has elapsed. Disabled since by default many auth providers
# have very short expiry times (e.g. 1 hour) which provide a poor user experience
TRACK_EXTERNAL_IDP_EXPIRY = (
    os.environ.get("TRACK_EXTERNAL_IDP_EXPIRY", "").lower() == "true"
)


#####
# DB Configs
#####
DOCUMENT_INDEX_NAME = "danswer_index"
# Vespa is now the default document index store for both keyword and vector
DOCUMENT_INDEX_TYPE = os.environ.get(
    "DOCUMENT_INDEX_TYPE", DocumentIndexType.COMBINED.value
)
VESPA_HOST = os.environ.get("VESPA_HOST") or "localhost"
# NOTE: this is used if and only if the vespa config server is accessible via a
# different host than the main vespa application
VESPA_CONFIG_SERVER_HOST = os.environ.get("VESPA_CONFIG_SERVER_HOST") or VESPA_HOST
VESPA_PORT = os.environ.get("VESPA_PORT") or "8081"
VESPA_TENANT_PORT = os.environ.get("VESPA_TENANT_PORT") or "19071"
# the number of times to try and connect to vespa on startup before giving up
VESPA_NUM_ATTEMPTS_ON_STARTUP = int(os.environ.get("NUM_RETRIES_ON_STARTUP") or 10)

VESPA_CLOUD_URL = os.environ.get("VESPA_CLOUD_URL", "")

# The default below is for dockerized deployment
VESPA_DEPLOYMENT_ZIP = (
    os.environ.get("VESPA_DEPLOYMENT_ZIP") or "/app/danswer/vespa-app.zip"
)
VESPA_CLOUD_CERT_PATH = os.environ.get("VESPA_CLOUD_CERT_PATH")
VESPA_CLOUD_KEY_PATH = os.environ.get("VESPA_CLOUD_KEY_PATH")

# Number of documents in a batch during indexing (further batching done by chunks before passing to bi-encoder)
try:
    INDEX_BATCH_SIZE = int(os.environ.get("INDEX_BATCH_SIZE", 16))
except ValueError:
    INDEX_BATCH_SIZE = 16

# Below are intended to match the env variables names used by the official postgres docker image
# https://hub.docker.com/_/postgres
POSTGRES_USER = os.environ.get("POSTGRES_USER") or "postgres"
# URL-encode the password for asyncpg to avoid issues with special characters on some machines.
POSTGRES_PASSWORD = urllib.parse.quote_plus(
    os.environ.get("POSTGRES_PASSWORD") or "password"
)
POSTGRES_HOST = os.environ.get("POSTGRES_HOST") or "localhost"
POSTGRES_PORT = os.environ.get("POSTGRES_PORT") or "5432"
POSTGRES_DB = os.environ.get("POSTGRES_DB") or "postgres"

POSTGRES_API_SERVER_POOL_SIZE = int(
    os.environ.get("POSTGRES_API_SERVER_POOL_SIZE") or 40
)
POSTGRES_API_SERVER_POOL_OVERFLOW = int(
    os.environ.get("POSTGRES_API_SERVER_POOL_OVERFLOW") or 10
)
# defaults to False
POSTGRES_POOL_PRE_PING = os.environ.get("POSTGRES_POOL_PRE_PING", "").lower() == "true"

# recycle timeout in seconds
POSTGRES_POOL_RECYCLE_DEFAULT = 60 * 20  # 20 minutes
try:
    POSTGRES_POOL_RECYCLE = int(
        os.environ.get("POSTGRES_POOL_RECYCLE", POSTGRES_POOL_RECYCLE_DEFAULT)
    )
except ValueError:
    POSTGRES_POOL_RECYCLE = POSTGRES_POOL_RECYCLE_DEFAULT

# Experimental setting to control idle transactions
POSTGRES_IDLE_SESSIONS_TIMEOUT_DEFAULT = 0  # milliseconds
try:
    POSTGRES_IDLE_SESSIONS_TIMEOUT = int(
        os.environ.get(
            "POSTGRES_IDLE_SESSIONS_TIMEOUT", POSTGRES_IDLE_SESSIONS_TIMEOUT_DEFAULT
        )
    )
except ValueError:
    POSTGRES_IDLE_SESSIONS_TIMEOUT = POSTGRES_IDLE_SESSIONS_TIMEOUT_DEFAULT

REDIS_SSL = os.getenv("REDIS_SSL", "").lower() == "true"
REDIS_HOST = os.environ.get("REDIS_HOST") or "localhost"
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD") or ""

# Used for general redis things
REDIS_DB_NUMBER = int(os.environ.get("REDIS_DB_NUMBER", 0))

# Used by celery as broker and backend
REDIS_DB_NUMBER_CELERY_RESULT_BACKEND = int(
    os.environ.get("REDIS_DB_NUMBER_CELERY_RESULT_BACKEND", 14)
)
REDIS_DB_NUMBER_CELERY = int(os.environ.get("REDIS_DB_NUMBER_CELERY", 15))  # broker

# will propagate to both our redis client as well as celery's redis client
REDIS_HEALTH_CHECK_INTERVAL = int(os.environ.get("REDIS_HEALTH_CHECK_INTERVAL", 60))

# our redis client only, not celery's
REDIS_POOL_MAX_CONNECTIONS = int(os.environ.get("REDIS_POOL_MAX_CONNECTIONS", 128))

# https://docs.celeryq.dev/en/stable/userguide/configuration.html#redis-backend-settings
# should be one of "required", "optional", or "none"
REDIS_SSL_CERT_REQS = os.getenv("REDIS_SSL_CERT_REQS", "none")
REDIS_SSL_CA_CERTS = os.getenv("REDIS_SSL_CA_CERTS", None)

CELERY_RESULT_EXPIRES = int(os.environ.get("CELERY_RESULT_EXPIRES", 86400))  # seconds

# https://docs.celeryq.dev/en/stable/userguide/configuration.html#broker-pool-limit
# Setting to None may help when there is a proxy in the way closing idle connections
CELERY_BROKER_POOL_LIMIT_DEFAULT = 10
try:
    CELERY_BROKER_POOL_LIMIT = int(
        os.environ.get("CELERY_BROKER_POOL_LIMIT", CELERY_BROKER_POOL_LIMIT_DEFAULT)
    )
except ValueError:
    CELERY_BROKER_POOL_LIMIT = CELERY_BROKER_POOL_LIMIT_DEFAULT

CELERY_WORKER_LIGHT_CONCURRENCY_DEFAULT = 24
try:
    CELERY_WORKER_LIGHT_CONCURRENCY = int(
        os.environ.get(
            "CELERY_WORKER_LIGHT_CONCURRENCY", CELERY_WORKER_LIGHT_CONCURRENCY_DEFAULT
        )
    )
except ValueError:
    CELERY_WORKER_LIGHT_CONCURRENCY = CELERY_WORKER_LIGHT_CONCURRENCY_DEFAULT

CELERY_WORKER_LIGHT_PREFETCH_MULTIPLIER_DEFAULT = 8
try:
    CELERY_WORKER_LIGHT_PREFETCH_MULTIPLIER = int(
        os.environ.get(
            "CELERY_WORKER_LIGHT_PREFETCH_MULTIPLIER",
            CELERY_WORKER_LIGHT_PREFETCH_MULTIPLIER_DEFAULT,
        )
    )
except ValueError:
    CELERY_WORKER_LIGHT_PREFETCH_MULTIPLIER = (
        CELERY_WORKER_LIGHT_PREFETCH_MULTIPLIER_DEFAULT
    )

CELERY_WORKER_INDEXING_CONCURRENCY_DEFAULT = 3
try:
    env_value = os.environ.get("CELERY_WORKER_INDEXING_CONCURRENCY")
    if not env_value:
        env_value = os.environ.get("NUM_INDEXING_WORKERS")

    if not env_value:
        env_value = str(CELERY_WORKER_INDEXING_CONCURRENCY_DEFAULT)
    CELERY_WORKER_INDEXING_CONCURRENCY = int(env_value)
except ValueError:
    CELERY_WORKER_INDEXING_CONCURRENCY = CELERY_WORKER_INDEXING_CONCURRENCY_DEFAULT

#####
# Connector Configs
#####
POLL_CONNECTOR_OFFSET = 30  # Minutes overlap between poll windows

# View the list here:
# https://github.com/danswer-ai/danswer/blob/main/backend/danswer/connectors/factory.py
# If this is empty, all connectors are enabled, this is an option for security heavy orgs where
# only very select connectors are enabled and admins cannot add other connector types
ENABLED_CONNECTOR_TYPES = os.environ.get("ENABLED_CONNECTOR_TYPES") or ""

# Some calls to get information on expert users are quite costly especially with rate limiting
# Since experts are not used in the actual user experience, currently it is turned off
# for some connectors
ENABLE_EXPENSIVE_EXPERT_CALLS = False


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
WEB_CONNECTOR_VALIDATE_URLS = (os.environ.get("WEB_CONNECTOR_VALIDATE_URLS") or "true").lower() == "true"

HTML_BASED_CONNECTOR_TRANSFORM_LINKS_STRATEGY = os.environ.get(
    "HTML_BASED_CONNECTOR_TRANSFORM_LINKS_STRATEGY",
    HtmlBasedConnectorTransformLinksStrategy.STRIP,
)

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

# Avoid to get archived pages
CONFLUENCE_CONNECTOR_INDEX_ARCHIVED_PAGES = (
    os.environ.get("CONFLUENCE_CONNECTOR_INDEX_ARCHIVED_PAGES", "").lower() == "true"
)

# Attachments exceeding this size will not be retrieved (in bytes)
CONFLUENCE_CONNECTOR_ATTACHMENT_SIZE_THRESHOLD = int(
    os.environ.get("CONFLUENCE_CONNECTOR_ATTACHMENT_SIZE_THRESHOLD", 10 * 1024 * 1024)
)
# Attachments with more chars than this will not be indexed. This is to prevent extremely
# large files from freezing indexing. 200,000 is ~100 google doc pages.
CONFLUENCE_CONNECTOR_ATTACHMENT_CHAR_COUNT_THRESHOLD = int(
    os.environ.get("CONFLUENCE_CONNECTOR_ATTACHMENT_CHAR_COUNT_THRESHOLD", 200_000)
)

# Due to breakages in the confluence API, the timezone offset must be specified client side
# to match the user's specified timezone.

# The current state of affairs:
# CQL queries are parsed in the user's timezone and cannot be specified in UTC
# no API retrieves the user's timezone
# All data is returned in UTC, so we can't derive the user's timezone from that

# https://community.developer.atlassian.com/t/confluence-cloud-time-zone-get-via-rest-api/35954/16
# https://jira.atlassian.com/browse/CONFCLOUD-69670

# enter as a floating point offset from UTC in hours (-24 < val < 24)
# this will be applied globally, so it probably makes sense to transition this to per
# connector as some point.
CONFLUENCE_TIMEZONE_OFFSET = float(os.environ.get("CONFLUENCE_TIMEZONE_OFFSET", 0.0))

JIRA_CONNECTOR_LABELS_TO_SKIP = [
    ignored_tag
    for ignored_tag in os.environ.get("JIRA_CONNECTOR_LABELS_TO_SKIP", "").split(",")
    if ignored_tag
]
# Maximum size for Jira tickets in bytes (default: 100KB)
JIRA_CONNECTOR_MAX_TICKET_SIZE = int(
    os.environ.get("JIRA_CONNECTOR_MAX_TICKET_SIZE", 100 * 1024)
)

GONG_CONNECTOR_START_TIME = os.environ.get("GONG_CONNECTOR_START_TIME")

GITHUB_CONNECTOR_BASE_URL = os.environ.get("GITHUB_CONNECTOR_BASE_URL") or None

GITLAB_CONNECTOR_INCLUDE_CODE_FILES = (
    os.environ.get("GITLAB_CONNECTOR_INCLUDE_CODE_FILES", "").lower() == "true"
)

# Egnyte specific configs
EGNYTE_LOCALHOST_OVERRIDE = os.getenv("EGNYTE_LOCALHOST_OVERRIDE")
EGNYTE_BASE_DOMAIN = os.getenv("EGNYTE_DOMAIN")
EGNYTE_CLIENT_ID = os.getenv("EGNYTE_CLIENT_ID")
EGNYTE_CLIENT_SECRET = os.getenv("EGNYTE_CLIENT_SECRET")

DASK_JOB_CLIENT_ENABLED = (
    os.environ.get("DASK_JOB_CLIENT_ENABLED", "").lower() == "true"
)
EXPERIMENTAL_CHECKPOINTING_ENABLED = (
    os.environ.get("EXPERIMENTAL_CHECKPOINTING_ENABLED", "").lower() == "true"
)

PRUNING_DISABLED = -1
DEFAULT_PRUNING_FREQ = 60 * 60 * 24  # Once a day

ALLOW_SIMULTANEOUS_PRUNING = (
    os.environ.get("ALLOW_SIMULTANEOUS_PRUNING", "").lower() == "true"
)

# This is the maximum rate at which documents are queried for a pruning job. 0 disables the limitation.
MAX_PRUNING_DOCUMENT_RETRIEVAL_PER_MINUTE = int(
    os.environ.get("MAX_PRUNING_DOCUMENT_RETRIEVAL_PER_MINUTE", 0)
)

# comma delimited list of zendesk article labels to skip indexing for
ZENDESK_CONNECTOR_SKIP_ARTICLE_LABELS = os.environ.get(
    "ZENDESK_CONNECTOR_SKIP_ARTICLE_LABELS", ""
).split(",")


#####
# Indexing Configs
#####
# NOTE: Currently only supported in the Confluence and Google Drive connectors +
# only handles some failures (Confluence = handles API call failures, Google
# Drive = handles failures pulling files / parsing them)
CONTINUE_ON_CONNECTOR_FAILURE = os.environ.get(
    "CONTINUE_ON_CONNECTOR_FAILURE", ""
).lower() not in ["false", ""]
# When swapping to a new embedding model, a secondary index is created in the background, to conserve
# resources, we pause updates on the primary index by default while the secondary index is created
DISABLE_INDEX_UPDATE_ON_SWAP = (
    os.environ.get("DISABLE_INDEX_UPDATE_ON_SWAP", "").lower() == "true"
)
# Controls how many worker processes we spin up to index documents in the
# background. This is useful for speeding up indexing, but does require a
# fairly large amount of memory in order to increase substantially, since
# each worker loads the embedding models into memory.
NUM_INDEXING_WORKERS = int(os.environ.get("NUM_INDEXING_WORKERS") or 1)
NUM_SECONDARY_INDEXING_WORKERS = int(
    os.environ.get("NUM_SECONDARY_INDEXING_WORKERS") or NUM_INDEXING_WORKERS
)
# More accurate results at the expense of indexing speed and index size (stores additional 4 MINI_CHUNK vectors)
ENABLE_MULTIPASS_INDEXING = (
    os.environ.get("ENABLE_MULTIPASS_INDEXING", "").lower() == "true"
)
# Finer grained chunking for more detail retention
# Slightly larger since the sentence aware split is a max cutoff so most minichunks will be under MINI_CHUNK_SIZE
# tokens. But we need it to be at least as big as 1/4th chunk size to avoid having a tiny mini-chunk at the end
MINI_CHUNK_SIZE = 150

# This is the number of regular chunks per large chunk
LARGE_CHUNK_RATIO = 4

# Include the document level metadata in each chunk. If the metadata is too long, then it is thrown out
# We don't want the metadata to overwhelm the actual contents of the chunk
SKIP_METADATA_IN_CHUNK = os.environ.get("SKIP_METADATA_IN_CHUNK", "").lower() == "true"
# Timeout to wait for job's last update before killing it, in hours
CLEANUP_INDEXING_JOBS_TIMEOUT = int(
    os.environ.get("CLEANUP_INDEXING_JOBS_TIMEOUT") or 3
)

# The indexer will warn in the logs whenver a document exceeds this threshold (in bytes)
INDEXING_SIZE_WARNING_THRESHOLD = int(
    os.environ.get("INDEXING_SIZE_WARNING_THRESHOLD") or 100 * 1024 * 1024
)

# during indexing, will log verbose memory diff stats every x batches and at the end.
# 0 disables this behavior and is the default.
INDEXING_TRACER_INTERVAL = int(os.environ.get("INDEXING_TRACER_INTERVAL") or 0)

# During an indexing attempt, specifies the number of batches which are allowed to
# exception without aborting the attempt.
INDEXING_EXCEPTION_LIMIT = int(os.environ.get("INDEXING_EXCEPTION_LIMIT") or 0)

# Maximum file size in a document to be indexed
MAX_DOCUMENT_CHARS = int(os.environ.get("MAX_DOCUMENT_CHARS") or 5_000_000)
MAX_FILE_SIZE_BYTES = int(
    os.environ.get("MAX_FILE_SIZE_BYTES") or 2 * 1024 * 1024 * 1024
)  # 2GB in bytes

#####
# Miscellaneous
#####
JOB_TIMEOUT = 60 * 60 * 6  # 6 hours default
# used to allow the background indexing jobs to use a different embedding
# model server than the API server
CURRENT_PROCESS_IS_AN_INDEXING_JOB = (
    os.environ.get("CURRENT_PROCESS_IS_AN_INDEXING_JOB", "").lower() == "true"
)
# Sets LiteLLM to verbose logging
LOG_ALL_MODEL_INTERACTIONS = (
    os.environ.get("LOG_ALL_MODEL_INTERACTIONS", "").lower() == "true"
)
# Logs Danswer only model interactions like prompts, responses, messages etc.
LOG_DANSWER_MODEL_INTERACTIONS = (
    os.environ.get("LOG_DANSWER_MODEL_INTERACTIONS", "").lower() == "true"
)
LOG_INDIVIDUAL_MODEL_TOKENS = (
    os.environ.get("LOG_INDIVIDUAL_MODEL_TOKENS", "").lower() == "true"
)
# If set to `true` will enable additional logs about Vespa query performance
# (time spent on finding the right docs + time spent fetching summaries from disk)
LOG_VESPA_TIMING_INFORMATION = (
    os.environ.get("LOG_VESPA_TIMING_INFORMATION", "").lower() == "true"
)
LOG_ENDPOINT_LATENCY = os.environ.get("LOG_ENDPOINT_LATENCY", "").lower() == "true"
LOG_POSTGRES_LATENCY = os.environ.get("LOG_POSTGRES_LATENCY", "").lower() == "true"
LOG_POSTGRES_CONN_COUNTS = (
    os.environ.get("LOG_POSTGRES_CONN_COUNTS", "").lower() == "true"
)
# Anonymous usage telemetry
DISABLE_TELEMETRY = os.environ.get("DISABLE_TELEMETRY", "").lower() == "true"

TOKEN_BUDGET_GLOBALLY_ENABLED = (
    os.environ.get("TOKEN_BUDGET_GLOBALLY_ENABLED", "").lower() == "true"
)

# Defined custom query/answer conditions to validate the query and the LLM answer.
# Format: list of strings
CUSTOM_ANSWER_VALIDITY_CONDITIONS = json.loads(
    os.environ.get("CUSTOM_ANSWER_VALIDITY_CONDITIONS", "[]")
)

VESPA_REQUEST_TIMEOUT = int(os.environ.get("VESPA_REQUEST_TIMEOUT") or "15")

SYSTEM_RECURSION_LIMIT = int(os.environ.get("SYSTEM_RECURSION_LIMIT") or "1000")

PARSE_WITH_TRAFILATURA = os.environ.get("PARSE_WITH_TRAFILATURA", "").lower() == "true"

#####
# Enterprise Edition Configs
#####
# NOTE: this should only be enabled if you have purchased an enterprise license.
# if you're interested in an enterprise license, please reach out to us at
# founders@danswer.ai OR message Chris Weaver or Yuhong Sun in the Danswer
# Slack community (https://join.slack.com/t/danswer/shared_invite/zt-1w76msxmd-HJHLe3KNFIAIzk_0dSOKaQ)
ENTERPRISE_EDITION_ENABLED = (
    os.environ.get("ENABLE_PAID_ENTERPRISE_EDITION_FEATURES", "").lower() == "true"
)

# Azure DALL-E Configurations
AZURE_DALLE_API_VERSION = os.environ.get("AZURE_DALLE_API_VERSION")
AZURE_DALLE_API_KEY = os.environ.get("AZURE_DALLE_API_KEY")
AZURE_DALLE_API_BASE = os.environ.get("AZURE_DALLE_API_BASE")
AZURE_DALLE_DEPLOYMENT_NAME = os.environ.get("AZURE_DALLE_DEPLOYMENT_NAME")


# Use managed Vespa (Vespa Cloud). If set, must also set VESPA_CLOUD_URL, VESPA_CLOUD_CERT_PATH and VESPA_CLOUD_KEY_PATH
MANAGED_VESPA = os.environ.get("MANAGED_VESPA", "").lower() == "true"

ENABLE_EMAIL_INVITES = os.environ.get("ENABLE_EMAIL_INVITES", "").lower() == "true"

# Security and authentication
DATA_PLANE_SECRET = os.environ.get(
    "DATA_PLANE_SECRET", ""
)  # Used for secure communication between the control and data plane
EXPECTED_API_KEY = os.environ.get(
    "EXPECTED_API_KEY", ""
)  # Additional security check for the control plane API

# API configuration
CONTROL_PLANE_API_BASE_URL = os.environ.get(
    "CONTROL_PLANE_API_BASE_URL", "http://localhost:8082"
)

# JWT configuration
JWT_ALGORITHM = "HS256"


#####
# API Key Configs
#####
# refers to the rounds described here: https://passlib.readthedocs.io/en/stable/lib/passlib.hash.sha256_crypt.html
_API_KEY_HASH_ROUNDS_RAW = os.environ.get("API_KEY_HASH_ROUNDS")
API_KEY_HASH_ROUNDS = (
    int(_API_KEY_HASH_ROUNDS_RAW) if _API_KEY_HASH_ROUNDS_RAW else None
)


POD_NAME = os.environ.get("POD_NAME")
POD_NAMESPACE = os.environ.get("POD_NAMESPACE")


DEV_MODE = os.environ.get("DEV_MODE", "").lower() == "true"

TEST_ENV = os.environ.get("TEST_ENV", "").lower() == "true"
