import math
import time
from collections.abc import Callable
from typing import Any
from typing import cast
from typing import TypeVar

from requests import HTTPError

from danswer.utils.logger import setup_logger

logger = setup_logger()


F = TypeVar("F", bound=Callable[..., Any])


RATE_LIMIT_MESSAGE_LOWERCASE = "Rate limit exceeded".lower()


class ConfluenceRateLimitError(Exception):
    pass


# commenting out while we try using confluence's rate limiter instead
# # https://developer.atlassian.com/cloud/confluence/rate-limiting/
# def make_confluence_call_handle_rate_limit(confluence_call: F) -> F:
#     def wrapped_call(*args: list[Any], **kwargs: Any) -> Any:
#         max_retries = 5
#         starting_delay = 5
#         backoff = 2

#         # max_delay is used when the server doesn't hand back "Retry-After"
#         # and we have to decide the retry delay ourselves
#         max_delay = 30  # Atlassian uses max_delay = 30 in their examples

#         # max_retry_after is used when we do get a "Retry-After" header
#         max_retry_after = 300  # should we really cap the maximum retry delay?

#         NEXT_RETRY_KEY = BaseConnector.REDIS_KEY_PREFIX + "confluence_next_retry"

#         # for testing purposes, rate limiting is written to fall back to a simpler
#         # rate limiting approach when redis is not available
#         r = get_redis_client()

#         for attempt in range(max_retries):
#             try:
#                 # if multiple connectors are waiting for the next attempt, there could be an issue
#                 # where many connectors are "released" onto the server at the same time.
#                 # That's not ideal ... but coming up with a mechanism for queueing
#                 # all of these connectors is a bigger problem that we want to take on
#                 # right now
#                 try:
#                     next_attempt = r.get(NEXT_RETRY_KEY)
#                     if next_attempt is None:
#                         next_attempt = 0
#                     else:
#                         next_attempt = int(cast(int, next_attempt))

#                     # TODO: all connectors need to be interruptible moving forward
#                     while time.monotonic() < next_attempt:
#                         time.sleep(1)
#                 except ConnectionError:
#                     pass

#                 return confluence_call(*args, **kwargs)
#             except HTTPError as e:
#                 # Check if the response or headers are None to avoid potential AttributeError
#                 if e.response is None or e.response.headers is None:
#                     logger.warning("HTTPError with `None` as response or as headers")
#                     raise e

#                 retry_after_header = e.response.headers.get("Retry-After")
#                 if (
#                     e.response.status_code == 429
#                     or RATE_LIMIT_MESSAGE_LOWERCASE in e.response.text.lower()
#                 ):
#                     retry_after = None
#                     if retry_after_header is not None:
#                         try:
#                             retry_after = int(retry_after_header)
#                         except ValueError:
#                             pass

#                     if retry_after is not None:
#                         if retry_after > max_retry_after:
#                             logger.warning(
#                                 f"Clamping retry_after from {retry_after} to {max_delay} seconds..."
#                             )
#                             retry_after = max_delay

#                         logger.warning(
#                             f"Rate limit hit. Retrying after {retry_after} seconds..."
#                         )
#                         try:
#                             r.set(
#                                 NEXT_RETRY_KEY,
#                                 math.ceil(time.monotonic() + retry_after),
#                             )
#                         except ConnectionError:
#                             pass
#                     else:
#                         logger.warning(
#                             "Rate limit hit. Retrying with exponential backoff..."
#                         )
#                         delay = min(starting_delay * (backoff**attempt), max_delay)
#                         delay_until = math.ceil(time.monotonic() + delay)

#                         try:
#                             r.set(NEXT_RETRY_KEY, delay_until)
#                         except ConnectionError:
#                             while time.monotonic() < delay_until:
#                                 time.sleep(1)
#                 else:
#                     # re-raise, let caller handle
#                     raise
#             except AttributeError as e:
#                 # Some error within the Confluence library, unclear why it fails.
#                 # Users reported it to be intermittent, so just retry
#                 logger.warning(f"Confluence Internal Error, retrying... {e}")
#                 delay = min(starting_delay * (backoff**attempt), max_delay)
#                 delay_until = math.ceil(time.monotonic() + delay)
#                 try:
#                     r.set(NEXT_RETRY_KEY, delay_until)
#                 except ConnectionError:
#                     while time.monotonic() < delay_until:
#                         time.sleep(1)

#                 if attempt == max_retries - 1:
#                     raise e

#     return cast(F, wrapped_call)


def _handle_http_error(e: HTTPError, attempt: int) -> int:
    MIN_DELAY = 2
    MAX_DELAY = 60
    STARTING_DELAY = 5
    BACKOFF = 2

    # Check if the response or headers are None to avoid potential AttributeError
    if e.response is None or e.response.headers is None:
        logger.warning("HTTPError with `None` as response or as headers")
        raise e

    if (
        e.response.status_code != 429
        and RATE_LIMIT_MESSAGE_LOWERCASE not in e.response.text.lower()
    ):
        raise e

    retry_after = None

    retry_after_header = e.response.headers.get("Retry-After")
    if retry_after_header is not None:
        try:
            retry_after = int(retry_after_header)
            if retry_after > MAX_DELAY:
                logger.warning(
                    f"Clamping retry_after from {retry_after} to {MAX_DELAY} seconds..."
                )
                retry_after = MAX_DELAY
            if retry_after < MIN_DELAY:
                retry_after = MIN_DELAY
        except ValueError:
            pass

    if retry_after is not None:
        logger.warning(
            f"Rate limiting with retry header. Retrying after {retry_after} seconds..."
        )
        delay = retry_after
    else:
        logger.warning(
            "Rate limiting without retry header. Retrying with exponential backoff..."
        )
        delay = min(STARTING_DELAY * (BACKOFF**attempt), MAX_DELAY)

    delay_until = math.ceil(time.monotonic() + delay)
    return delay_until


# https://developer.atlassian.com/cloud/confluence/rate-limiting/
# this uses the native rate limiting option provided by the
# confluence client and otherwise applies a simpler set of error handling
def make_confluence_call_handle_rate_limit(confluence_call: F) -> F:
    def wrapped_call(*args: list[Any], **kwargs: Any) -> Any:
        MAX_RETRIES = 5

        TIMEOUT = 3600
        timeout_at = time.monotonic() + TIMEOUT

        for attempt in range(MAX_RETRIES):
            if time.monotonic() > timeout_at:
                raise TimeoutError(
                    f"Confluence call attempts took longer than {TIMEOUT} seconds."
                )

            try:
                # we're relying more on the client to rate limit itself
                # and applying our own retries in a more specific set of circumstances
                return confluence_call(*args, **kwargs)
            except HTTPError as e:
                delay_until = _handle_http_error(e, attempt)
                while time.monotonic() < delay_until:
                    # in the future, check a signal here to exit
                    time.sleep(1)
            except AttributeError as e:
                # Some error within the Confluence library, unclear why it fails.
                # Users reported it to be intermittent, so just retry
                if attempt == MAX_RETRIES - 1:
                    raise e

                logger.exception(
                    "Confluence Client raised an AttributeError. Retrying..."
                )
                time.sleep(5)

    return cast(F, wrapped_call)
