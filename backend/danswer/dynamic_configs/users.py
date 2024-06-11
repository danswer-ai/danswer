from typing import cast

from danswer.dynamic_configs.factory import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.dynamic_configs.interface import JSON_ro

USER_STORE_KEY = "USERS"


def get_invited_users() -> list[str]:
    try:
        store = get_dynamic_config_store()
        return cast(list, store.load(USER_STORE_KEY))
    except ConfigNotFoundError:
        return list()


def write_invited_users(emails: list[str]) -> int:
    all_emails = list(set(emails) | set(get_invited_users()))
    store = get_dynamic_config_store()
    store.store(USER_STORE_KEY, cast(JSON_ro, all_emails))
    return len(all_emails)
