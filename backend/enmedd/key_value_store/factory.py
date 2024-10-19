from enmedd.key_value_store.interface import KeyValueStore
from enmedd.key_value_store.store import PgRedisKVStore


def get_kv_store() -> KeyValueStore:
    # this is the only one supported currently
    return PgRedisKVStore()
