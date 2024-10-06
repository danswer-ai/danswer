from enum import Enum


def get_query(**kwargs) -> dict:
    ret = {k: v for k, v in kwargs.items() if v is not None}
    for k, v in ret.items():
        if isinstance(v, Enum):
            ret[k] = v.value
    return ret