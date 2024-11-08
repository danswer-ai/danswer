from typing import Any
from typing import Dict


# https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
def get_text_adf(data: Dict[str, Any]) -> str:
    if "text" in data:
        return data["text"]
    if "content" in data:
        return " ".join(get_text_adf(item) for item in data["content"])
    return ""


def get_with_default(d: Dict[str, Any], key: str, default: Any) -> Any:
    return d.get(key, default) if d.get(key) is not None else default
