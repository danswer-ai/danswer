from danswer.dynamic_configs.interface import DynamicConfigStore
from danswer.dynamic_configs.store import PostgresBackedDynamicConfigStore


def get_dynamic_config_store() -> DynamicConfigStore:
    # this is the only one supported currently
    return PostgresBackedDynamicConfigStore()
