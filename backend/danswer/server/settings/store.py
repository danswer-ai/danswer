from typing import cast

from onyx.configs.constants import KV_SETTINGS_KEY
from onyx.dynamic_configs.factory import get_dynamic_config_store
from onyx.dynamic_configs.interface import ConfigNotFoundError
from onyx.server.settings.models import Settings


def load_settings() -> Settings:
    dynamic_config_store = get_dynamic_config_store()
    try:
        settings = Settings(**cast(dict, dynamic_config_store.load(KV_SETTINGS_KEY)))
    except ConfigNotFoundError:
        settings = Settings()
        dynamic_config_store.store(KV_SETTINGS_KEY, settings.model_dump())

    return settings


def store_settings(settings: Settings) -> None:
    get_dynamic_config_store().store(KV_SETTINGS_KEY, settings.model_dump())
