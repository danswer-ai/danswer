# This file is purely for development use, not included in any builds
import os
import sys
import logging
import requests

from requests.exceptions import RequestException
from time import sleep

# makes it so `PYTHONPATH=.` is not required when running this script
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)

from danswer.configs.app_configs import DOCUMENT_INDEX_NAME  # noqa: E402
from danswer.document_index.vespa.index import DOCUMENT_ID_ENDPOINT  # noqa: E402
from danswer.utils.logger import setup_logger  # noqa: E402

logger = setup_logger()

def wipe_vespa_index() -> None:
    """
    Wipes the Vespa index by deleting all documents.
    """
    continuation = None
    should_continue = True
    retries = 3

    while should_continue:
        params = {"selection": "true", "cluster": DOCUMENT_INDEX_NAME}
        if continuation:
            params["continuation"] = continuation

        for attempt in range(retries):
            try:
                response = requests.delete(DOCUMENT_ID_ENDPOINT, params=params)
                response.raise_for_status()

                response_json = response.json()
                logger.info(f"Response: {response_json}")

                continuation = response_json.get("continuation")
                should_continue = bool(continuation)
                break  # Exit the retry loop if the request is successful

            except RequestException as e:
                logger.error(f"Request failed: {e}")
                sleep(2 ** attempt)  # Exponential backoff
        else:
            logger.error("Max retries exceeded. Exiting.")
            sys.exit(1)

def main():
    """
    Main function to execute the script.
    """
    try:
        wipe_vespa_index()
        logger.info("Vespa index wiped successfully.")
    except Exception as e:
        logger.error(f"An error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
