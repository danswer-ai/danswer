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
SESSION_EXPIRE_TIME_SECONDS = int(os.environ.get("SESSION_EXPIRE_TIME_SECONDS", 3600))
VALID_EMAIL_DOMAIN = os.environ.get("VALID_EMAIL_DOMAIN", "")
# OAuth Login Flow
ENABLE_OAUTH = os.environ.get("ENABLE_OAUTH", "").lower() != "false"
GOOGLE_OAUTH_CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "")
GOOGLE_OAUTH_CLIENT_SECRET = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET", "")


#####
# Vector DB Configs
#####
DEFAULT_VECTOR_STORE = os.environ.get("VECTOR_DB", "qdrant")
# Url / Key are used to connect to a remote Qdrant instance
QDRANT_URL = os.environ.get("QDRANT_URL", "")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")
# Host / Port are used for connecting to local Qdrant instance
QDRANT_HOST = os.environ.get("QDRANT_HOST", "localhost")
QDRANT_PORT = 6333
QDRANT_DEFAULT_COLLECTION = os.environ.get("QDRANT_COLLECTION", "semantic_search")
DB_CONN_TIMEOUT = 2  # Timeout seconds connecting to DBs
INDEX_BATCH_SIZE = 16  # File batches (not accounting file chunking)


#####
# Connector Configs
#####
GOOGLE_DRIVE_CREDENTIAL_JSON = os.environ.get("GOOGLE_DRIVE_CREDENTIAL_JSON", "")
GOOGLE_DRIVE_TOKENS_JSON = os.environ.get("GOOGLE_DRIVE_TOKENS_JSON", "")
GOOGLE_DRIVE_INCLUDE_SHARED = False

GITHUB_ACCESS_TOKEN = os.environ.get("GITHUB_ACCESS_TOKEN", "")


#####
# Query Configs
#####
DEFAULT_PROMPT = "generic-qa"
NUM_RETURNED_HITS = 15
NUM_RERANKED_RESULTS = 4
KEYWORD_MAX_HITS = 5
QUOTE_ALLOWED_ERROR_PERCENT = 0.05  # 1 edit per 2 characters


#####
# Text Processing Configs
#####
# Chunking docs to this number of characters not including finishing the last word and the overlap words below
# Calculated by ~500 to 512 tokens max * average 4 chars per token
CHUNK_SIZE = 2000
# Each chunk includes an additional 5 words from previous chunk
# in extreme cases, may cause some words at the end to be truncated by embedding model
CHUNK_OVERLAP = 5


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
TYPESENSE_API_KEY = os.environ.get("TYPESENSE_API_KEY", "")
TYPESENSE_HOST = "localhost"
TYPESENSE_PORT = 8108
