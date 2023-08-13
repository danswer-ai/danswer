from typing import Any


def mask_string(sensitive_str: str) -> str:
    return "****...**" + sensitive_str[-4:]


def mask_credential_dict(credential_dict: dict[str, Any]) -> dict[str, str]:
    masked_creds = {}
    for key, val in credential_dict.items():
        if not isinstance(val, str):
            raise ValueError(
                "Unable to mask credentials of type other than string, cannot process request."
            )

        masked_creds[key] = mask_string(val)
    return masked_creds
