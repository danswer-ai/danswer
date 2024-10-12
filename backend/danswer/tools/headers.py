from fastapi.datastructures import Headers

from danswer.configs.model_configs import TOOL_PASS_THROUGH_HEADERS


def get_tool_headers(headers: dict[str, str] | Headers) -> dict[str, str]:
    """
    Extract headers specified in TOOL_PASS_THROUGH_HEADERS from input headers.
    Handles both dict and FastAPI Headers objects, accounting for lowercase keys.

    Args:
        headers: Input headers as dict or Headers object.

    Returns:
        dict: Filtered headers based on TOOL_PASS_THROUGH_HEADERS.
    """
    if not TOOL_PASS_THROUGH_HEADERS:
        return {}

    pass_through_headers = {}
    for key in TOOL_PASS_THROUGH_HEADERS:
        # fastapi makes all header keys lowercase, handling that here
        lowercase_key = key.lower()
        if key in headers:
            pass_through_headers[key] = headers[key]
        elif lowercase_key in headers:
            pass_through_headers[lowercase_key] = headers[lowercase_key]

    return pass_through_headers
