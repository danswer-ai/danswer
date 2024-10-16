from danswer.configs.model_configs import LITELLM_EXTRA_HEADERS


def build_llm_extra_headers(
    additional_headers: dict[str, str] | None = None
) -> dict[str, str]:
    extra_headers: dict[str, str] = {}
    if additional_headers:
        extra_headers.update(additional_headers)
    if LITELLM_EXTRA_HEADERS:
        extra_headers.update(LITELLM_EXTRA_HEADERS)
    return extra_headers
