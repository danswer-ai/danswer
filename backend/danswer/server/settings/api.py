import os
from typing import Dict, List

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from danswer.auth.users import current_admin_user
from danswer.auth.users import current_user
from danswer.db.models import User
from danswer.server.settings.models import Settings, KeyValueStoreGeneric

from danswer.server.settings.store import load_settings, store_settings, store_key_value, load_key_value, delete_key_value_generic

from danswer.configs.app_configs import IMAGE_SERVER_PROTOCOL
from danswer.configs.app_configs import IMAGE_SERVER_HOST
from danswer.configs.app_configs import IMAGE_SERVER_PORT
from danswer.utils.logger import setup_logger

USER_INFO_KEY = "USER_INFO_"
IMAGE_URL_KEY = "IMAGE_URL_"

admin_router = APIRouter(prefix="/admin/settings")
basic_router = APIRouter(prefix="/settings")
logger = setup_logger()

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



@basic_router.get("/icons")
def get_image_urls(_: User | None = Depends(current_user)) -> dict[str, list[str]]:

    directory_path = "/icons"  # Change this to your directory path
    image_urls = list_image_urls(directory_path)
    return {"icons_urls": image_urls}

def list_image_urls(directory_path: str):
    """
    Lists all imaes URLs from the given directory.
    """
    IMAGE_SERVER_BASE_URL = get_image_server_url()
    image_urls = []
    try:
        for root, _, files in os.walk(directory_path):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, directory_path)
                    image_url = IMAGE_SERVER_BASE_URL + relative_path.replace("\\", "/")
                    image_urls.append(image_url)
    except Exception as ex:
        logger.error(f"error while fetching icons from dir path: {directory_path} : ref img url:  {IMAGE_SERVER_BASE_URL}. Error: {ex}")
    return image_urls


def get_image_server_url():
    return IMAGE_SERVER_PROTOCOL + "://" + IMAGE_SERVER_HOST + ":" + IMAGE_SERVER_PORT + "/" + "icons/"
