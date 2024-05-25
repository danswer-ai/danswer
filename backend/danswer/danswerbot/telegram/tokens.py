import os

from pydantic import BaseModel
from pydantic import root_validator
from pydantic import validator

from typing import cast

from danswer.dynamic_configs.factory import get_dynamic_config_store

class TelegramBotToken(BaseModel):
  api_id: int
  api_hash: str
  bot_name: str
  bot_token: str
    
  class Config:
    frozen = True

_TELEGRAM_BOT_TOKEN_CONFIG_KEY = "telegram_bot_token_config_key"

def fetch_token():
  api_id = os.getenv('TELEGRAM_API_ID')
  api_hash = os.getenv('TELEGRAM_API_HASH')
  bot_name = os.getenv('TELEGRAM_BOT_NAME')
  bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
  return TelegramBotToken(api_id=api_id, api_hash=api_hash, bot_name=bot_name, bot_token=bot_token)
