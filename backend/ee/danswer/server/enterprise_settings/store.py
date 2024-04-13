import os
from typing import cast

from danswer.dynamic_configs.factory import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from ee.danswer.server.enterprise_settings.models import AnalyticsScriptUpload
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


_CUSTOM_ANALYTICS_SCRIPT_KEY = "__custom_analytics_script__"
_CUSTOM_ANALYTICS_SECRET_KEY = os.environ.get("CUSTOM_ANALYTICS_SECRET_KEY")


def load_analytics_script() -> str | None:
    dynamic_config_store = get_dynamic_config_store()
    try:
        return cast(str, dynamic_config_store.load(_CUSTOM_ANALYTICS_SCRIPT_KEY))
    except ConfigNotFoundError:
        return None


def store_analytics_script(analytics_script_upload: AnalyticsScriptUpload) -> None:
    if (
        not _CUSTOM_ANALYTICS_SECRET_KEY
        or analytics_script_upload.secret_key != _CUSTOM_ANALYTICS_SECRET_KEY
    ):
        raise ValueError("Invalid secret key")

    get_dynamic_config_store().store(
        _CUSTOM_ANALYTICS_SCRIPT_KEY, analytics_script_upload.script
    )
