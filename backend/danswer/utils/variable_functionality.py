from enum import Enum
import functools
import importlib
from typing import Any, Callable, TypeVar


class DanswerVersion:
    def __init__(self) -> None:
        self._is_ee = False

    def set_ee(self) -> None:
        self._is_ee = True

    def get_is_ee_version(self) -> bool:
        return self._is_ee


global_version = DanswerVersion()


F = TypeVar("F", bound=Callable)


class VariableFunctionalityIdentifier(str, Enum):
    VERIFY_AUTH_SETTING = "danswer.auth.users.verify_auth_setting"


class VariableFunctionalityManager:
    def __init__(self):
        self.funcs: dict[VariableFunctionalityIdentifier, F] = {}
        self.ee_funcs: dict[VariableFunctionalityIdentifier, F] = {}

    def register(self, identifier: VariableFunctionalityIdentifier, *, ee: bool = False) -> Callable[[F], F]:
        def decorator(func: F) -> F:
            mapping = self.ee_funcs if ee else self.funcs
            mapping.setdefault(identifier, func)

            return func

        return decorator

    def get(self, identifier: VariableFunctionalityIdentifier) -> F:
        if global_version.get_is_ee_version():
            return self.ee_funcs[identifier]

        return self.funcs[identifier]


variable_functionality_manager = VariableFunctionalityManager()


@functools.lru_cache(maxsize=128)
def fetch_versioned_implementation(module: str, attribute: str) -> Any:
    module_full = f"ee.{module}" if global_version.get_is_ee_version() else module
    return getattr(importlib.import_module(module_full), attribute)
