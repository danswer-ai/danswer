from typing import cast

from enmedd.dynamic_configs.factory import get_dynamic_config_store
from enmedd.dynamic_configs.interface import ConfigNotFoundError
from enmedd.server.settings.models import Settings

# TODO: replace the name here
_SETTINGS_KEY = "enmedd_settings"


def load_settings() -> Settings:
    dynamic_config_store = get_dynamic_config_store()
    try:
        settings = Settings(**cast(dict, dynamic_config_store.load(_SETTINGS_KEY)))
    except ConfigNotFoundError:
        settings = Settings()
        dynamic_config_store.store(_SETTINGS_KEY, settings.dict())

    return settings


def store_settings(settings: Settings) -> None:
    get_dynamic_config_store().store(_SETTINGS_KEY, settings.dict())
