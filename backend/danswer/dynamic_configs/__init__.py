import os

from danswer.dynamic_configs.file_system.store import (
    FileSystemBackedDynamicConfigStore,
)
from danswer.dynamic_configs.interface import DynamicConfigStore


def get_dynamic_config_store() -> DynamicConfigStore:
    dynamic_config_store_type = os.environ.get("DYNAMIC_CONFIG_STORE")
    if dynamic_config_store_type == FileSystemBackedDynamicConfigStore.__name__:
        return FileSystemBackedDynamicConfigStore(os.environ["DYNAMIC_CONFIG_DIR_PATH"])

    # TODO: change exception type
    raise Exception("Unknown dynamic config store type")
