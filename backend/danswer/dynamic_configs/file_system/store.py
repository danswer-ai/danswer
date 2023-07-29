import json
import os
from pathlib import Path
from typing import cast

from filelock import FileLock

from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.dynamic_configs.interface import DynamicConfigStore
from danswer.dynamic_configs.interface import JSON_ro


FILE_LOCK_TIMEOUT = 10


def _get_file_lock(file_name: Path) -> FileLock:
    return FileLock(file_name.with_suffix(".lock"))


class FileSystemBackedDynamicConfigStore(DynamicConfigStore):
    def __init__(self, dir_path: str) -> None:
        # TODO (chris): maybe require all possible keys to be passed in
        # at app start somehow to prevent key overlaps
        self.dir_path = Path(dir_path)

    def store(self, key: str, val: JSON_ro) -> None:
        file_path = self.dir_path / key
        lock = _get_file_lock(file_path)
        with lock.acquire(timeout=FILE_LOCK_TIMEOUT):
            with open(file_path, "w+") as f:
                json.dump(val, f)

    def load(self, key: str) -> JSON_ro:
        file_path = self.dir_path / key
        if not file_path.exists():
            raise ConfigNotFoundError
        lock = _get_file_lock(file_path)
        with lock.acquire(timeout=FILE_LOCK_TIMEOUT):
            with open(self.dir_path / key) as f:
                return cast(JSON_ro, json.load(f))

    def delete(self, key: str) -> None:
        file_path = self.dir_path / key
        if not file_path.exists():
            raise ConfigNotFoundError
        lock = _get_file_lock(file_path)
        with lock.acquire(timeout=FILE_LOCK_TIMEOUT):
            os.remove(file_path)
