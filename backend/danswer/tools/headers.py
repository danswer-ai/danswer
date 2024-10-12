from fastapi.datastructures import Headers

from danswer.configs.model_configs import TOOL_PASS_THROUGH_HEADERS


def get_tool_additional_request_headers(
    headers: dict[str, str] | Headers
) -> dict[str, str]:
    if not TOOL_PASS_THROUGH_HEADERS:
        return {}

    pass_through_headers: dict[str, str] = {}
    for key in TOOL_PASS_THROUGH_HEADERS:
        if key in headers:
            pass_through_headers[key] = headers[key]
        else:
            # fastapi makes all header keys lowercase, handling that here
            lowercase_key = key.lower()
            if lowercase_key in headers:
                pass_through_headers[lowercase_key] = headers[lowercase_key]

    return pass_through_headers


def build_tool_extra_headers(
    additional_headers: dict[str, str] | None = None
) -> dict[str, str]:
    extra_headers: dict[str, str] = {}
    if additional_headers:
        extra_headers.update(additional_headers)
    return extra_headers
