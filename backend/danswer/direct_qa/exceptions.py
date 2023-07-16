class OpenAIKeyMissing(Exception):
    def __init__(self, msg: str = "Unable to find an OpenAI Key") -> None:
        super().__init__(msg)


class UnknownModelError(Exception):
    def __init__(self, model_name: str) -> None:
        super().__init__(f"Unknown Internal QA model name: {model_name}")
