import os
from collections.abc import Callable
from typing import Any
from typing import TypeVar

from requests import HTTPError


F = TypeVar("F", bound=Callable[..., Any])


def wrap_confluence_call(confluence_call: F) -> F:
    def wrapped_call(*args: list[Any], **kwargs: Any) -> Any:
        try:
            return confluence_call()
        except HTTPError as e:
            print(e)


if __name__ == "__main__":
    import threading
    from danswer.connectors.confluence.connector import ConfluenceConnector

    connector = ConfluenceConnector(os.environ["CONFLUENCE_TEST_SPACE_URL"])
    connector.load_credentials(
        {
            "confluence_username": os.environ["CONFLUENCE_USER_NAME"],
            "confluence_access_token": os.environ["CONFLUENCE_ACCESS_TOKEN"],
        }
    )

    while True:
        threads = [
            threading.Thread(
                target=lambda: connector._fetch_comments(
                    connector.confluence_client, 1146902
                )
            )
            for _ in range(500)
        ]
        for t in threads:
            t.start()

        for t in threads:
            t.join()
        print("done")
