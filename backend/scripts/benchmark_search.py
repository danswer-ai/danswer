import time

import requests

from danswer.configs.app_configs import DOCUMENT_INDEX_NAME
from danswer.search.models import SearchType


def _measure_hybrid_search_latency():
    start = time.monotonic()
    response = requests.post(
        "http://localhost:8080/document-search",
        json={
            "query": "test",
            "collection": DOCUMENT_INDEX_NAME,
            "filters": {},
            "enable_auto_detect_filters": False,
            "search_type": SearchType.HYBRID.value,
        },
    )
    if not response.ok:
        raise Exception(f"Failed to search: {response.text}")
    return time.monotonic() - start


if __name__ == "__main__":
    latencies: list[float] = []
    for _ in range(30):
        latencies.append(_measure_hybrid_search_latency())
        print("Latency", latencies[-1])
    print(f"Average latency: {sum(latencies) / len(latencies)}")
