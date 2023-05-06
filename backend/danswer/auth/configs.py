import os

SECRET = os.environ.get("SECRET", "")
SESSION_EXPIRE_TIME_SECONDS = int(os.environ.get("SESSION_EXPIRE_TIME_SECONDS", 3600))

ENABLE_OAUTH = os.environ.get("ENABLE_OAUTH", "False").lower() != "false"
GOOGLE_OAUTH_CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "")
GOOGLE_OAUTH_CLIENT_SECRET = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET", "")
