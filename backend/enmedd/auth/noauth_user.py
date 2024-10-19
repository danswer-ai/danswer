from collections.abc import Mapping
from typing import Any
from typing import cast

from enmedd.auth.schemas import UserRole
from enmedd.configs.constants import KV_NO_AUTH_USER_PREFERENCES_KEY
from enmedd.key_value_store.store import KeyValueStore
from enmedd.key_value_store.store import KvKeyNotFoundError
from enmedd.server.manage.models import UserInfo
from enmedd.server.manage.models import UserPreferences


def set_no_auth_user_preferences(
    store: KeyValueStore, preferences: UserPreferences
) -> None:
    store.store(KV_NO_AUTH_USER_PREFERENCES_KEY, preferences.model_dump())


def load_no_auth_user_preferences(store: KeyValueStore) -> UserPreferences:
    try:
        preferences_data = cast(
            Mapping[str, Any], store.load(KV_NO_AUTH_USER_PREFERENCES_KEY)
        )
        return UserPreferences(**preferences_data)
    except KvKeyNotFoundError:
        return UserPreferences(chosen_assistants=None, default_model=None)


def fetch_no_auth_user(store: KeyValueStore) -> UserInfo:
    return UserInfo(
        id="__no_auth_user__",
        email="anonymous@enmedd.ai",
        is_active=True,
        is_superuser=False,
        is_verified=True,
        role=UserRole.ADMIN,
        preferences=load_no_auth_user_preferences(store),
        full_name=None,
        company_name=None,
        company_email=None,
        company_billing=None,
        billing_email_address=None,
        vat=None,
    )
