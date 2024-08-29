from typing import cast

from danswer.dynamic_configs.factory import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.server.settings.models import Settings, KeyValueStoreGeneric

_SETTINGS_KEY = "danswer_settings"


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


def load_key_value(key) -> KeyValueStoreGeneric:
    dynamic_config_store = get_dynamic_config_store()
    try:
        kvstore = KeyValueStoreGeneric(**cast(dict, dynamic_config_store.load(key)))
    except ConfigNotFoundError:
        kvstore = KeyValueStoreGeneric()
        dynamic_config_store.store(key, kvstore.dict())
    return kvstore


def store_key_value(kvstore: KeyValueStoreGeneric) -> None:
    get_dynamic_config_store().store(kvstore.key, kvstore.dict())


def delete_key_value_generic(key) -> None:
    get_dynamic_config_store().delete(key)
