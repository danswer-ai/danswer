from fastapi.datastructures import Headers

from danswer.configs.model_configs import TOOL_PASS_THROUGH_HEADERS


def get_tool_headers(headers: dict[str, str] | Headers) -> dict[str, str]:
    if not TOOL_PASS_THROUGH_HEADERS:
        return {}

    pass_through_headers = {}
    for key in TOOL_PASS_THROUGH_HEADERS:
        lowercase_key = key.lower()
        if key in headers:
            pass_through_headers[key] = headers[key]
        elif lowercase_key in headers:
            pass_through_headers[lowercase_key] = headers[lowercase_key]

    return pass_through_headers
