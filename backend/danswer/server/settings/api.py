from datetime import datetime
from datetime import timedelta
from datetime import timezone
from typing import cast

import httpx
from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.auth.users import current_user
from danswer.auth.users import get_user_manager
from danswer.auth.users import is_user_admin
from danswer.auth.users import UserManager
from danswer.configs.constants import KV_REINDEX_KEY
from danswer.configs.constants import NotificationType
from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.db.notification import create_notification
from danswer.db.notification import dismiss_all_notifications
from danswer.db.notification import dismiss_notification
from danswer.db.notification import get_notification_by_id
from danswer.db.notification import get_notifications
from danswer.db.notification import update_notification_last_shown
from danswer.dynamic_configs.factory import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.server.settings.models import Notification
from danswer.server.settings.models import Settings
from danswer.server.settings.models import UserSettings
from danswer.server.settings.store import load_settings
from danswer.server.settings.store import store_settings
from danswer.utils.logger import setup_logger
from shared_configs.configs import CUSTOM_REFRESH_URL

router = APIRouter()
logger = setup_logger()


admin_router = APIRouter(prefix="/admin/settings")
basic_router = APIRouter(prefix="/settings")


def mocked_refresh_token() -> dict:
    """
    This function mocks the response from a token refresh endpoint.
    It generates a mock access token, refresh token, and user information
    with an expiration time set to 1 hour from now.
    This is useful for testing or development when the actual refresh endpoint is not available.
    """
    mock_exp = int((datetime.now() + timedelta(hours=1)).timestamp() * 1000)
    data = {
        "access_token": "asdf Mock access token",
        "refresh_token": "asdf Mock refresh token",
        "session": {"exp": mock_exp},
        "userinfo": {
            "sub": "Mock email",
            "familyName": "Mock name",
            "givenName": "Mock name",
            "fullName": "Mock name",
            "userId": "Mock User ID",
            "email": "chris@danswer.ai",
        },
    }
    return data


@basic_router.get("/refresh-token")
async def refresh_access_token(
    user: User = Depends(current_user),
    user_manager: UserManager = Depends(get_user_manager),
) -> None:
    if CUSTOM_REFRESH_URL is None:
        logger.error(
            "Custom refresh URL is not set and client is attempting to custom refresh"
        )
        raise HTTPException(
            status_code=500,
            detail="Custom refresh URL is not set",
        )

    try:
        async with httpx.AsyncClient() as client:
            logger.debug(f"Sending request to custom refresh URL for user {user.id}")
            access_token = user.oauth_accounts[0].access_token

            response = await client.get(
                CUSTOM_REFRESH_URL,
                params={"info": "json", "access_token_refresh_interval": 3600},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            data = response.json()

            # NOTE: Here is where we can mock the response
            # data = mocked_refresh_token()

        logger.debug(f"Received response from Meechum auth URL for user {user.id}")

        # Extract new tokens
        new_access_token = data["access_token"]
        new_refresh_token = data["refresh_token"]

        new_expiry = datetime.fromtimestamp(
            data["session"]["exp"] / 1000, tz=timezone.utc
        )
        expires_at_timestamp = int(new_expiry.timestamp())

        logger.debug(f"Access token has been refreshed for user {user.id}")

        await user_manager.oauth_callback(
            oauth_name="google",
            access_token=new_access_token,
            account_id=data["userinfo"]["userId"],
            account_email=data["userinfo"]["email"],
            expires_at=expires_at_timestamp,
            refresh_token=new_refresh_token,
            associate_by_email=True,
        )

        logger.info(f"Successfully refreshed tokens for user {user.id}")

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            logger.warning(f"Full authentication required for user {user.id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Full authentication required",
            )
        logger.error(
            f"HTTP error occurred while refreshing token for user {user.id}: {str(e)}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token",
        )
    except Exception as e:
        logger.error(
            f"Unexpected error occurred while refreshing token for user {user.id}: {str(e)}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )


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
def fetch_settings(
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> UserSettings:
    """Settings and notifications are stuffed into this single endpoint to reduce number of
    Postgres calls"""
    general_settings = load_settings()
    user_notifications = get_user_notifications(user, db_session)

    try:
        kv_store = get_dynamic_config_store()
        needs_reindexing = cast(bool, kv_store.load(KV_REINDEX_KEY))
    except ConfigNotFoundError:
        needs_reindexing = False

    return UserSettings(
        **general_settings.model_dump(),
        notifications=user_notifications,
        needs_reindexing=needs_reindexing,
    )


@basic_router.post("/notifications/{notification_id}/dismiss")
def dismiss_notification_endpoint(
    notification_id: int,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    try:
        notification = get_notification_by_id(notification_id, user, db_session)
    except PermissionError:
        raise HTTPException(
            status_code=403, detail="Not authorized to dismiss this notification"
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Notification not found")

    dismiss_notification(notification, db_session)


def get_user_notifications(
    user: User | None, db_session: Session
) -> list[Notification]:
    """Get notifications for the user, currently the logic is very specific to the reindexing flag"""
    is_admin = is_user_admin(user)
    if not is_admin:
        # Reindexing flag should only be shown to admins, basic users can't trigger it anyway
        return []

    kv_store = get_dynamic_config_store()
    try:
        needs_index = cast(bool, kv_store.load(KV_REINDEX_KEY))
        if not needs_index:
            dismiss_all_notifications(
                notif_type=NotificationType.REINDEX, db_session=db_session
            )
            return []
    except ConfigNotFoundError:
        # If something goes wrong and the flag is gone, better to not start a reindexing
        # it's a heavyweight long running job and maybe this flag is cleaned up later
        logger.warning("Could not find reindex flag")
        return []

    try:
        # Need a transaction in order to prevent under-counting current notifications
        db_session.begin()

        reindex_notifs = get_notifications(
            user=user, notif_type=NotificationType.REINDEX, db_session=db_session
        )

        if not reindex_notifs:
            notif = create_notification(
                user=user,
                notif_type=NotificationType.REINDEX,
                db_session=db_session,
            )
            db_session.flush()
            db_session.commit()
            return [Notification.from_model(notif)]

        if len(reindex_notifs) > 1:
            logger.error("User has multiple reindex notifications")

        reindex_notif = reindex_notifs[0]
        update_notification_last_shown(
            notification=reindex_notif, db_session=db_session
        )

        db_session.commit()
        return [Notification.from_model(reindex_notif)]
    except SQLAlchemyError:
        logger.exception("Error while processing notifications")
        db_session.rollback()
        return []
