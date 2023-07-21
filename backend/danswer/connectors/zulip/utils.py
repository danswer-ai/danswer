import time
from typing import Any, Callable, Dict, Optional
from danswer.utils.logger import setup_logger
from urllib.parse import quote

logger = setup_logger()

class ZulipAPIError(Exception):
    def __init__(self, code=None, msg=None):
        self.code = code
        self.msg = msg

    def __str__(self) -> str:
        return (
            f"Error occurred during Zulip API call: {self.msg}" + ""
            if self.code is None
            else f" ({self.code})"
        )
    
class ZulipHTTPError(ZulipAPIError):
    def __init__(self, msg=None, status_code=None):
        super().__init__(code=None, msg=msg)
        self.status_code = status_code

    def __str__(self) -> str:
        return f"HTTP error {self.status_code} occurred during Zulip API call"

def __call_with_retry(fun: Callable, *args, **kwargs) -> Dict[str, Any]:
    result = fun(*args, **kwargs)
    if result.get("result") == "error":
        if result.get("code") == "RATE_LIMIT_HIT":
            retry_after = float(result["retry-after"])+1
            logger.warn(f"Rate limit hit, retrying after {retry_after} seconds")
            time.sleep(retry_after)
            return __call_with_retry(fun, *args)
    return result

def __raise_if_error(response: dict[str, Any]) -> None:
    if response.get("result") == "error":
        raise ZulipAPIError(
            code=response.get("code"),
            msg=response.get("msg"),
        )
    elif response.get("result") == "http-error":
        raise ZulipHTTPError(
            msg=response.get("msg"),
            status_code=response.get("status_code")
        )

def call_api(fun: Callable, *args, **kwargs) -> Dict[str, Any]:
    response = __call_with_retry(fun, *args, **kwargs)
    __raise_if_error(response)
    return response

def build_search_narrow(
        *,
        stream: Optional[str] = None,
        topic: Optional[str] = None,
        limit: int = 100,
        content: Optional[str] = None,
        apply_md: bool = False,
        anchor: str = "newest",
) -> Dict[str, Any]:
    narrow = {
        "anchor": anchor,
        "num_before": limit,
        "num_after": 0,
        "narrow": [
        ],
    }

    if stream:
        narrow["narrow"].append({"operator": "stream", "operand": stream})

    if topic:
        narrow["narrow"].append({"operator": "topic", "operand": topic})

    if content:
        narrow["narrow"].append({"operator": "has", "operand": content})

    if not stream and not topic and not content:
        narrow["narrow"].append({"operator": "streams", "operand": "public"})

    narrow["apply_markdown"] = apply_md

    return narrow

def encode_zulip_narrow_operand(value: str) -> str:
    # like https://github.com/zulip/zulip/blob/1577662a6/static/js/hash_util.js#L18-L25
    # safe characters necessary to make Python match Javascript's escaping behaviour,
    # see: https://stackoverflow.com/a/74439601
    return quote(value, safe="!~*'()").replace(".", "%2E").replace("%", ".")