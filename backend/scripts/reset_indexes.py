# This file is purely for development use, not included in any builds
import requests

from danswer.configs.app_configs import DOCUMENT_INDEX_NAME
from danswer.datastores.vespa.store import DOCUMENT_ID_ENDPOINT
from danswer.utils.logger import setup_logger

logger = setup_logger()


def wipe_vespa_index() -> None:
    params = {"selection": "true", "cluster": DOCUMENT_INDEX_NAME}
    response = requests.delete(DOCUMENT_ID_ENDPOINT, params=params)
    response.raise_for_status()


if __name__ == "__main__":
    wipe_vespa_index()
