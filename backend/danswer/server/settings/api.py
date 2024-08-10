from typing import cast

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from danswer.auth.users import current_admin_user
from danswer.auth.users import current_user
from danswer.auth.users import is_user_admin
from danswer.configs.constants import KV_REINDEX_KEY
from danswer.db.models import User
from danswer.dynamic_configs.factory import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.server.settings.models import Notification
from danswer.server.settings.models import Settings
from danswer.server.settings.models import UserSettings
from danswer.server.settings.store import load_settings
from danswer.server.settings.store import store_settings
from danswer.utils.logger import setup_logger


logger = setup_logger()


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
def fetch_settings(user: User | None = Depends(current_user)) -> UserSettings:
    general_settings = load_settings()
    user_notifications = get_user_notifications(user)
    return UserSettings(**general_settings.dict(), **user_notifications.dict())


def get_user_notifications(user: User | None) -> Notification:
    """Get any notification names, currently the only one is the reindexing flag"""
    is_admin = is_user_admin(user)
    if not is_admin:
        return Notification(notif_name=None)
    kv_store = get_dynamic_config_store()
    try:
        need_index = cast(bool, kv_store.load(KV_REINDEX_KEY))
        return Notification(notif_name=KV_REINDEX_KEY if need_index else None)
    except ConfigNotFoundError:
        # If something goes wrong and the flag is gone, better to not start a reindexing
        # it's a heavyweight long running job and maybe this flag is cleaned up later
        logger.warning("Could not find reindex flag")
        return Notification(notif_name=None)
