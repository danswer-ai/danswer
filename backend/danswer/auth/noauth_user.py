from collections.abc import Mapping
from typing import Any
from typing import cast

from onyx.auth.schemas import UserRole
from onyx.configs.constants import KV_NO_AUTH_USER_PREFERENCES_KEY
from onyx.dynamic_configs.store import ConfigNotFoundError
from onyx.dynamic_configs.store import DynamicConfigStore
from onyx.server.manage.models import UserInfo
from onyx.server.manage.models import UserPreferences


def set_no_auth_user_preferences(
    store: DynamicConfigStore, preferences: UserPreferences
) -> None:
    store.store(KV_NO_AUTH_USER_PREFERENCES_KEY, preferences.model_dump())


def load_no_auth_user_preferences(store: DynamicConfigStore) -> UserPreferences:
    try:
        preferences_data = cast(
            Mapping[str, Any], store.load(KV_NO_AUTH_USER_PREFERENCES_KEY)
        )
        return UserPreferences(**preferences_data)
    except ConfigNotFoundError:
        return UserPreferences(chosen_assistants=None, default_model=None)


def fetch_no_auth_user(store: DynamicConfigStore) -> UserInfo:
    return UserInfo(
        id="__no_auth_user__",
        email="anonymous@onyx.ai",
        is_active=True,
        is_superuser=False,
        is_verified=True,
        role=UserRole.ADMIN,
        preferences=load_no_auth_user_preferences(store),
    )
