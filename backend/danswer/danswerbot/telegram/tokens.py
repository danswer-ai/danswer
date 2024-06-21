import os

from pydantic import BaseModel


class TelegramBotToken(BaseModel):
    api_id: int
    api_hash: str
    bot_name: str
    bot_token: str

    class Config:
        frozen = True


_TELEGRAM_BOT_TOKEN_CONFIG_KEY = "telegram_bot_token_config_key"


def fetch_token() -> TelegramBotToken:
    api_id_candidate = os.getenv("TELEGRAM_API_ID")
    if api_id_candidate is None:
        raise ValueError("TELEGRAM_API_ID is not set")
    try:
        api_id = int(api_id_candidate)
    except ValueError as e:
        raise e
    api_hash = os.getenv("TELEGRAM_API_HASH", "")
    bot_name = os.getenv("TELEGRAM_BOT_NAME", "")
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    return TelegramBotToken(
        api_id=api_id, api_hash=api_hash, bot_name=bot_name, bot_token=bot_token
    )
