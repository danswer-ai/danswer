from typing import Dict, Any


# https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
def get_text_adf(data: Dict[str, Any]) -> str:
    if "text" in data:
        return data["text"]
    if "content" in data:
        return " ".join(get_text_adf(item) for item in data["content"])
    return ""


def get_with_default(d, key, default):
    return d.get(key, default) if d.get(key) is not None else default