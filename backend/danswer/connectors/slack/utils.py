import time
from collections.abc import Callable
from typing import Any
from typing import cast

from slack_sdk.errors import SlackApiError
from slack_sdk.web import SlackResponse

_SLACK_LIMIT = 900


def get_message_link(
    event: dict[str, Any], workspace: str, channel_id: str | None = None
) -> str:
    channel_id = channel_id or cast(
        str, event["channel"]
    )  # channel must either be present in the event or passed in
    message_ts = cast(str, event["ts"])
    message_ts_without_dot = message_ts.replace(".", "")
    return (
        f"https://{workspace}.slack.com/archives/{channel_id}/p{message_ts_without_dot}"
    )


def make_slack_api_call_paginated(
    call: Callable[..., SlackResponse],
) -> Callable[..., list[dict[str, Any]]]:
    """Wraps calls to slack API so that they automatically handle pagination"""

    def paginated_call(**kwargs: Any) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        cursor: str | None = None
        has_more = True
        while has_more:
            for result in call(cursor=cursor, limit=_SLACK_LIMIT, **kwargs):
                has_more = result.get("has_more", False)
                cursor = result.get("response_metadata", {}).get("next_cursor", "")
                results.append(cast(dict[str, Any], result))
        return results

    return paginated_call


def make_slack_api_rate_limited(
    call: Callable[..., SlackResponse], max_retries: int = 3
) -> Callable[..., SlackResponse]:
    """Wraps calls to slack API so that they automatically handle rate limiting"""

    def rate_limited_call(**kwargs: Any) -> SlackResponse:
        for _ in range(max_retries):
            try:
                # Make the API call
                response = call(**kwargs)

                # Check for errors in the response
                if response.get("ok"):
                    return response
                else:
                    raise SlackApiError("", response)

            except SlackApiError as e:
                if e.response["error"] == "ratelimited":
                    # Handle rate limiting: get the 'Retry-After' header value and sleep for that duration
                    retry_after = int(e.response.headers.get("Retry-After", 1))
                    time.sleep(retry_after)
                else:
                    # Raise the error for non-transient errors
                    raise

        # If the code reaches this point, all retries have been exhausted
        raise Exception(f"Max retries ({max_retries}) exceeded")

    return rate_limited_call
