# This file is purely for development use, not included in any builds
import os
import sys

import requests

# makes it so `PYTHONPATH=.` is not required when running this script
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)

from danswer.configs.app_configs import DOCUMENT_INDEX_NAME  # noqa: E402
from danswer.document_index.vespa.index import DOCUMENT_ID_ENDPOINT  # noqa: E402
from danswer.utils.logger import setup_logger  # noqa: E402

logger = setup_logger()


def wipe_vespa_index() -> None:
    continuation = None
    should_continue = True
    while should_continue:
        params = {"selection": "true", "cluster": DOCUMENT_INDEX_NAME}
        if continuation:
            params = {**params, "continuation": continuation}
        response = requests.delete(DOCUMENT_ID_ENDPOINT, params=params)
        response.raise_for_status()

        response_json = response.json()
        print(response_json)

        continuation = response_json.get("continuation")
        should_continue = bool(continuation)


if __name__ == "__main__":
    wipe_vespa_index()
