# This script preps the documents used for initially seeding the index. It handles the embedding so that the
# documents can be added to the index with minimal processing.
import os

os.environ["LOG_LEVEL"] = "DEBUG"


from sentence_transformers import SentenceTransformer  # noqa: E402
from danswer.connectors.web.connector import WEB_CONNECTOR_VALID_SETTINGS  # noqa: E402
from danswer.connectors.web.connector import WebConnector  # noqa: E402


model = SentenceTransformer("nomic-ai/nomic-embed-text-v1", trust_remote_code=True)
tokenizer = model.tokenizer

web_connector = WebConnector(
    # Have to use the override because the redirect is incorrect
    base_url="https://docs.danswer.dev/use_cases",
    web_connector_type=WEB_CONNECTOR_VALID_SETTINGS.SINGLE.value,
    batch_size=100,
    site_list_override=[
        "https://docs.danswer.dev/use_cases/overview",
        "https://docs.danswer.dev/use_cases/enterprise_search",
        "https://docs.danswer.dev/use_cases/ai_platform",
        "https://docs.danswer.dev/use_cases/support",
        "https://docs.danswer.dev/use_cases/sales",
        "https://docs.danswer.dev/use_cases/operations",
    ],
)
document_batches = web_connector.load_from_state()
use_case_pages = next(document_batches)

use_case_pages
