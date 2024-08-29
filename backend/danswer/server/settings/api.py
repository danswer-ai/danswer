from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from danswer.auth.users import current_admin_user
from danswer.auth.users import current_user
from danswer.db.models import User
from danswer.server.settings.models import Settings, KeyValueStoreGeneric

from danswer.server.settings.store import load_settings, store_settings, store_key_value, load_key_value, delete_key_value_generic

USER_INFO_KEY = "USER_INFO_"
IMAGE_URL_KEY = "IMAGE_URL_"

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


@basic_router.put("/user_info")
def upsert_user_info(user_info: KeyValueStoreGeneric, _: User | None = Depends(current_user)) -> None:
    key = f"{USER_INFO_KEY}{user_info.key}"
    kvstore = KeyValueStoreGeneric(key=key, value=user_info.value)
    store_key_value(kvstore)


@basic_router.get('/user_info/{key}')
def get_user_info(key: str,  _: User | None = Depends(current_user)) -> KeyValueStoreGeneric:
    key = f"{USER_INFO_KEY}{key}"
    return load_key_value(key)


@basic_router.delete('/user_info/{key}')
def delete_user_info(key: str,  _: User | None = Depends(current_user)) -> None:
    key = f"{USER_INFO_KEY}{key}"
    delete_key_value_generic(key)


@basic_router.put("/image_url")
def upsert_image_url(user_info: KeyValueStoreGeneric, _: User | None = Depends(current_user)) -> None:
    key = f"{IMAGE_URL_KEY}{user_info.key}"
    kvstore = KeyValueStoreGeneric(key=key, value=user_info.value)
    store_key_value(kvstore)


@basic_router.get('/image_url/{key}')
def get_image_url(key: str,  _: User | None = Depends(current_user)) -> KeyValueStoreGeneric:
    key = f"{IMAGE_URL_KEY}{key}"
    return load_key_value(key)


@basic_router.delete('/image_url/{key}')
def delete_image_url(key: str,  _: User | None = Depends(current_user)) -> None:
    key = f"{IMAGE_URL_KEY}{key}"
    delete_key_value_generic(key)


