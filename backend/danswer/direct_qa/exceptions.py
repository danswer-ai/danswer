class OpenAIKeyMissing(Exception):
    default_msg = (
        "Unable to find existing OpenAI Key. "
        'A new key can be added from "Keys" section of the Admin Panel'
    )

    def __init__(self, msg: str = default_msg) -> None:
        super().__init__(msg)


class UnknownModelError(Exception):
    def __init__(self, model_name: str) -> None:
        super().__init__(f"Unknown Internal QA model name: {model_name}")
