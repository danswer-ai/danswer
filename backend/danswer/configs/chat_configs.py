import os

FORCE_TOOL_PROMPT = os.environ.get("FORCE_TOOL_PROMPT", "").lower() == "true"
HARD_DELETE_CHATS = os.environ.get("HARD_DELETE_CHATS", "True").lower() != "false"
