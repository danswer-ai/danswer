import functools
import importlib
from typing import Any
from typing import TypeVar

from danswer.utils.logger import setup_logger


logger = setup_logger()


class DanswerVersion:
    def __init__(self) -> None:
        self._is_ee = False

    def set_ee(self) -> None:
        self._is_ee = True

    def get_is_ee_version(self) -> bool:
        return self._is_ee


global_version = DanswerVersion()


@functools.lru_cache(maxsize=128)
def fetch_versioned_implementation(module: str, attribute: str) -> Any:
    logger.debug("Fetching versioned implementation for %s.%s", module, attribute)
    is_ee = global_version.get_is_ee_version()

    module_full = f"ee.{module}" if is_ee else module
    try:
        return getattr(importlib.import_module(module_full), attribute)
    except ModuleNotFoundError:
        # try the non-ee version as a fallback
        if is_ee:
            return getattr(importlib.import_module(module), attribute)

        raise


T = TypeVar("T")


def fetch_versioned_implementation_with_fallback(
    module: str, attribute: str, fallback: T
) -> T:
    try:
        return fetch_versioned_implementation(module, attribute)
    except Exception as e:
        logger.warning(
            "Failed to fetch versioned implementation for %s.%s: %s",
            module,
            attribute,
            e,
        )
        return fallback
