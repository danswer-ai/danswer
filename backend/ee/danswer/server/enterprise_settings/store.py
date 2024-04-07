from typing import cast

from danswer.dynamic_configs.factory import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from ee.danswer.server.enterprise_settings.models import EnterpriseSettings


_ENTERPRISE_SETTINGS_KEY = "danswer_enterprise_settings"


def load_settings() -> EnterpriseSettings:
    dynamic_config_store = get_dynamic_config_store()
    try:
        settings = EnterpriseSettings(
            **cast(dict, dynamic_config_store.load(_ENTERPRISE_SETTINGS_KEY))
        )
    except ConfigNotFoundError:
        settings = EnterpriseSettings()
        dynamic_config_store.store(_ENTERPRISE_SETTINGS_KEY, settings.dict())

    return settings


def store_settings(settings: EnterpriseSettings) -> None:
    get_dynamic_config_store().store(_ENTERPRISE_SETTINGS_KEY, settings.dict())
