import os


PROMPTS_YAML = "./danswer/chat/prompts.yaml"
PERSONAS_YAML = "./danswer/chat/personas.yaml"

NUM_RETURNED_HITS = 50
NUM_RERANKED_RESULTS = 15

# May be less depending on model
MAX_CHUNKS_FED_TO_CHAT = float(os.environ.get("MAX_CHUNKS_FED_TO_CHAT") or 10.0)
# For Chat, need to keep enough space for history and other prompt pieces
# ~3k input, half for docs, half for chat history + prompts
CHAT_TARGET_CHUNK_PERCENTAGE = 512 * 3 / 3072

# For selecting a different LLM question-answering prompt format
# Valid values: default, cot, weak
QA_PROMPT_OVERRIDE = os.environ.get("QA_PROMPT_OVERRIDE") or None
# 1 / (1 + DOC_TIME_DECAY * doc-age-in-years), set to 0 to have no decay
# Capped in Vespa at 0.5
DOC_TIME_DECAY = float(
    os.environ.get("DOC_TIME_DECAY") or 0.5  # Hits limit at 2 years by default
)
BASE_RECENCY_DECAY = 0.5
FAVOR_RECENT_DECAY_MULTIPLIER = 2.0
# Currently this next one is not configurable via env
DISABLE_LLM_QUERY_ANSWERABILITY = QA_PROMPT_OVERRIDE == "weak"
DISABLE_LLM_FILTER_EXTRACTION = (
    os.environ.get("DISABLE_LLM_FILTER_EXTRACTION", "").lower() == "true"
)
# Whether the LLM should evaluate all of the document chunks passed in for usefulness
# in relation to the user query
DISABLE_LLM_CHUNK_FILTER = (
    os.environ.get("DISABLE_LLM_CHUNK_FILTER", "").lower() == "true"
)
# Whether the LLM should be used to decide if a search would help given the chat history
DISABLE_LLM_CHOOSE_SEARCH = (
    os.environ.get("DISABLE_LLM_CHOOSE_SEARCH", "").lower() == "true"
)
DISABLE_LLM_QUERY_REPHRASE = (
    os.environ.get("DISABLE_LLM_QUERY_REPHRASE", "").lower() == "true"
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
HYBRID_ALPHA = max(0, min(1, float(os.environ.get("HYBRID_ALPHA") or 0.62)))
# Weighting factor between Title and Content of documents during search, 1 for completely
# Title based. Default heavily favors Content because Title is also included at the top of
# Content. This is to avoid cases where the Content is very relevant but it may not be clear
# if the title is separated out. Title is most of a "boost" than a separate field.
TITLE_CONTENT_RATIO = max(
    0, min(1, float(os.environ.get("TITLE_CONTENT_RATIO") or 0.20))
)
# A list of languages passed to the LLM to rephase the query
# For example "English,French,Spanish", be sure to use the "," separator
MULTILINGUAL_QUERY_EXPANSION = os.environ.get("MULTILINGUAL_QUERY_EXPANSION") or None
LANGUAGE_HINT = "\n" + (
    os.environ.get("LANGUAGE_HINT")
    or "IMPORTANT: Respond in the same language as my query!"
)
LANGUAGE_CHAT_NAMING_HINT = (
    os.environ.get("LANGUAGE_CHAT_NAMING_HINT")
    or "The name of the conversation must be in the same language as the user query."
)

# Stops streaming answers back to the UI if this pattern is seen:
STOP_STREAM_PAT = os.environ.get("STOP_STREAM_PAT") or None

# The backend logic for this being True isn't fully supported yet
HARD_DELETE_CHATS = False
