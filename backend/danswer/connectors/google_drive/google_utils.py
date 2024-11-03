from collections.abc import Callable
from collections.abc import Iterator
from typing import Any

from danswer.connectors.google_drive.models import GoogleDriveFileType
from danswer.utils.retry_wrapper import retry_builder


# Google Drive APIs are quite flakey and may 500 for an
# extended period of time. Trying to combat here by adding a very
# long retry period (~20 minutes of trying every minute)
add_retries = retry_builder(tries=50, max_delay=30)


def execute_paginated_retrieval(
    retrieval_function: Callable,
    list_key: str,
    **kwargs: Any,
) -> Iterator[GoogleDriveFileType]:
    """Execute a paginated retrieval from Google Drive API
    Args:
        retrieval_function: The specific list function to call (e.g., service.files().list)
        **kwargs: Arguments to pass to the list function
    """
    next_page_token = ""
    while next_page_token is not None:
        request_kwargs = kwargs.copy()
        if next_page_token:
            request_kwargs["pageToken"] = next_page_token

        results = (lambda: retrieval_function(**request_kwargs).execute())()

        next_page_token = results.get("nextPageToken")
        for item in results.get(list_key, []):
            yield item
