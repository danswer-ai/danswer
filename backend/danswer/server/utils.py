import json
from typing import Any


def get_json_line(json_dict: dict) -> str:
    return json.dumps(json_dict) + "\n"


def mask_string(sensitive_str: str) -> str:
    return "****...**" + sensitive_str[-4:]


def mask_credential_dict(credential_dict: dict[str, Any]) -> dict[str, str]:
    masked_creds = {}
    for key, val in credential_dict.items():
        if isinstance(val, bool):
            masked_creds[key] = str(val)  # Convert boolean to string
        elif isinstance(val, str):
            masked_creds[key] = mask_string(val)
        else:
            raise ValueError(
                f"Unable to mask credentials of type other than string or boolean, cannot process request. "
                f"Received type: {type(val)}"
            )

    return masked_creds