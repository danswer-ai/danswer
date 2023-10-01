import importlib
from typing import Any


class DanswerVersion:
    def __init__(self) -> None:
        self._is_ee = False

    def set_ee(self) -> None:
        self._is_ee = True

    def get_is_ee_version(self) -> bool:
        return self._is_ee


global_version = DanswerVersion()


def fetch_versioned_implementation(module: str, attribute: str) -> Any:
    module_full = f"ee.{module}" if global_version.get_is_ee_version() else module
    return getattr(importlib.import_module(module_full), attribute)
