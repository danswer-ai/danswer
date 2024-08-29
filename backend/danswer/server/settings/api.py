from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from danswer.auth.users import current_admin_user
from danswer.auth.users import current_user
from danswer.db.models import User
from danswer.server.settings.models import Settings, KeyValueStoreGeneric

from danswer.server.settings.store import load_settings, store_settings, store_key_value, load_key_value, delete_key_value_generic

admin_router = APIRouter(prefix="/admin/settings")
basic_router = APIRouter(prefix="/settings")


@admin_router.put("")
def put_settings(
    settings: Settings, _: User | None = Depends(current_admin_user)
) -> None:
    try:
        settings.check_validity()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    store_settings(settings)


@basic_router.get("")
def fetch_settings(_: User | None = Depends(current_user)) -> Settings:
    return load_settings()


@basic_router.put("/add")
def upsert_key_value(key1: KeyValueStoreGeneric, _: User | None = Depends(current_user)) -> None:
    kvstore = KeyValueStoreGeneric(key=key1.key, value=key1.value)
    store_key_value(kvstore)


@basic_router.get('/{key}')
def get_key_value(key: str,  _: User | None = Depends(current_user)) -> KeyValueStoreGeneric:
    return load_key_value(key)


@basic_router.delete('/{key}')
def delete_key_value(key: str,  _: User | None = Depends(current_user)) -> None:
    delete_key_value_generic(key)


