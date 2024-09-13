from typing import TypeVar


T = TypeVar("T")


def batch_list(
    lst: list[T],
    batch_size: int,
) -> list[list[T]]:
    return [lst[i : i + batch_size] for i in range(0, len(lst), batch_size)]


def obfuscate_api_key(api_key: str | None) -> str | None:
    if api_key is None:
        return None
    return "*" * len(api_key)
