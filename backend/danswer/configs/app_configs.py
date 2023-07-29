import os

#####
# App Configs
#####
APP_HOST = "0.0.0.0"
APP_PORT = 8080


#####
# User Facing Features Configs
#####
BLURB_LENGTH = 200  # Characters. Blurbs will be truncated at the first punctuation after this many characters.
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
VALID_EMAIL_DOMAIN = os.environ.get("VALID_EMAIL_DOMAIN", "")
# OAuth Login Flow
ENABLE_OAUTH = os.environ.get("ENABLE_OAUTH", "").lower() != "false"
OAUTH_TYPE = os.environ.get("OAUTH_TYPE", "google").lower()
OAUTH_CLIENT_ID = os.environ.get("OAUTH_CLIENT_ID", os.environ.get("GOOGLE_OAUTH_CLIENT_ID", ""))
OAUTH_CLIENT_SECRET = os.environ.get("OAUTH_CLIENT_SECRET", os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET", ""))
OPENID_CONFIG_URL = os.environ.get("OPENID_CONFIG_URL", "")
MASK_CREDENTIAL_PREFIX = (
    os.environ.get("MASK_CREDENTIAL_PREFIX", "True").lower() != "false"
)


#####
# DB Configs
#####
# Qdrant is Semantic Search Vector DB
# Url / Key are used to connect to a remote Qdrant instance
QDRANT_URL = os.environ.get("QDRANT_URL", "")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")
# Host / Port are used for connecting to local Qdrant instance
QDRANT_HOST = os.environ.get("QDRANT_HOST", "localhost")
QDRANT_PORT = 6333
QDRANT_DEFAULT_COLLECTION = os.environ.get("QDRANT_DEFAULT_COLLECTION", "danswer_index")
# Typesense is the Keyword Search Engine
TYPESENSE_HOST = os.environ.get("TYPESENSE_HOST", "localhost")
TYPESENSE_PORT = 8108
TYPESENSE_DEFAULT_COLLECTION = os.environ.get(
    "TYPESENSE_DEFAULT_COLLECTION", "danswer_index"
)
TYPESENSE_API_KEY = os.environ.get("TYPESENSE_API_KEY", "")
# Number of documents in a batch during indexing (further batching done by chunks before passing to bi-encoder)
INDEX_BATCH_SIZE = 16

# below are intended to match the env variables names used by the official postgres docker image
# https://hub.docker.com/_/postgres
POSTGRES_USER = os.environ.get("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "password")
POSTGRES_HOST = os.environ.get("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.environ.get("POSTGRES_PORT", "5432")
POSTGRES_DB = os.environ.get("POSTGRES_DB", "postgres")


#####
# Connector Configs
#####
GOOGLE_DRIVE_INCLUDE_SHARED = False
FILE_CONNECTOR_TMP_STORAGE_PATH = os.environ.get(
    "FILE_CONNECTOR_TMP_STORAGE_PATH", "/home/file_connector_storage"
)
# TODO these should be available for frontend configuration, via advanced options expandable
WEB_CONNECTOR_IGNORED_CLASSES = os.environ.get(
    "WEB_CONNECTOR_IGNORED_CLASSES", "sidebar,header,footer"
).split(",")
WEB_CONNECTOR_IGNORED_ELEMENTS = os.environ.get(
    "WEB_CONNECTOR_IGNORED_ELEMENTS", "nav,header,footer,meta,script,style,symbol,aside"
).split(",")
WEB_CONNECTOR_OAUTH_CLIENT_ID = os.environ.get("WEB_CONNECTOR_OAUTH_CLIENT_ID")
WEB_CONNECTOR_OAUTH_CLIENT_SECRET = os.environ.get("WEB_CONNECTOR_OAUTH_CLIENT_SECRET")
WEB_CONNECTOR_OAUTH_TOKEN_URL = os.environ.get("WEB_CONNECTOR_OAUTH_TOKEN_URL")

#####
# Query Configs
#####
NUM_RETURNED_HITS = 50
NUM_RERANKED_RESULTS = 15
NUM_GENERATIVE_AI_INPUT_DOCS = 5
# 1 edit per 2 characters, currently unused due to fuzzy match being too slow
QUOTE_ALLOWED_ERROR_PERCENT = 0.05
QA_TIMEOUT = 10  # 10 seconds
# Include additional document/chunk metadata in prompt to GenerativeAI
INCLUDE_METADATA = False


#####
# Text Processing Configs
#####
# Chunking docs to this number of characters not including finishing the last word and the overlap words below
# Calculated by ~500 to 512 tokens max * average 4 chars per token
CHUNK_SIZE = 2000
# More accurate results at the expense of indexing speed and index size (stores additional 4 MINI_CHUNK vectors)
ENABLE_MINI_CHUNK = False
# Mini chunks for fine-grained embedding, calculated as 128 tokens for 4 additional vectors for 512 chunk size above
# Not rounded down to not lose any context in full chunk.
MINI_CHUNK_SIZE = 512
# Each chunk includes an additional CHUNK_WORD_OVERLAP words from previous chunk
CHUNK_WORD_OVERLAP = 5
# When trying to finish the last word in the chunk or counting back CHUNK_WORD_OVERLAP backwards,
# This is the max number of characters allowed in either direction
CHUNK_MAX_CHAR_OVERLAP = 50


#####
# Other API Keys
#####
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")


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
DYNAMIC_CONFIG_STORE = os.environ.get(
    "DYNAMIC_CONFIG_STORE", "FileSystemBackedDynamicConfigStore"
)
DYNAMIC_CONFIG_DIR_PATH = os.environ.get("DYNAMIC_CONFIG_DIR_PATH", "/home/storage")
# notset, debug, info, warning, error, or critical
LOG_LEVEL = os.environ.get("LOG_LEVEL", "info")


#####
# Danswer Slack Bot Configs
#####
DANSWER_BOT_NUM_DOCS_TO_DISPLAY = int(
    os.environ.get("DANSWER_BOT_NUM_DOCS_TO_DISPLAY", "5")
)
DANSWER_BOT_NUM_RETRIES = int(os.environ.get("DANSWER_BOT_NUM_RETRIES", "5"))
