import json
import os

from cohere import Client

from ee.danswer.configs.app_configs import COHERE_DEFAULT_API_KEY


def load_processed_docs(cohere_enabled: bool) -> list[dict]:
    base_path = os.path.join(os.getcwd(), "danswer", "seeding")

    if cohere_enabled and COHERE_DEFAULT_API_KEY:
        initial_docs_path = os.path.join(base_path, "initial_docs_cohere.json")
        processed_docs = json.load(open(initial_docs_path))

        cohere_client = Client(COHERE_DEFAULT_API_KEY)
        embed_model = "embed-english-v3.0"

        for doc in processed_docs:
            doc["title_embedding"] = cohere_client.embed(
                texts=[doc["title"]], model=embed_model
            ).embeddings[0]
            doc["content_embedding"] = cohere_client.embed(
                texts=[doc["content"]], model=embed_model
            ).embeddings[0]
    else:
        initial_docs_path = os.path.join(base_path, "initial_docs.json")
        processed_docs = json.load(open(initial_docs_path))

    return processed_docs
