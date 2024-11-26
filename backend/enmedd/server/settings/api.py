import smtplib
from typing import cast
from typing import Optional

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ee.enmedd.utils.encryption import encrypt_password
from enmedd.auth.users import current_teamspace_admin_user
from enmedd.auth.users import current_user
from enmedd.auth.users import current_workspace_admin_user
from enmedd.auth.users import is_user_admin
from enmedd.configs.constants import KV_REINDEX_KEY
from enmedd.configs.constants import NotificationType
from enmedd.db.engine import get_session
from enmedd.db.models import User
from enmedd.db.models import WorkspaceSettings
from enmedd.db.notification import create_notification
from enmedd.db.notification import dismiss_all_notifications
from enmedd.db.notification import dismiss_notification
from enmedd.db.notification import get_notification_by_id
from enmedd.db.notification import get_notifications
from enmedd.db.notification import update_notification_last_shown
from enmedd.key_value_store.factory import get_kv_store
from enmedd.key_value_store.interface import KvKeyNotFoundError
from enmedd.server.settings.models import Notification
from enmedd.server.settings.models import Settings
from enmedd.server.settings.models import SmtpUpdate
from enmedd.server.settings.models import UserSettings
from enmedd.server.settings.models import WorkspaceThemes
from enmedd.server.settings.store import load_settings
from enmedd.server.settings.store import load_workspace_themes
from enmedd.server.settings.store import store_settings
from enmedd.server.settings.store import store_workspace_themes
from enmedd.utils.logger import setup_logger


logger = setup_logger()

router = APIRouter(prefix="/themes")
admin_router = APIRouter(prefix="/admin/settings")
basic_router = APIRouter(prefix="/settings")


@router.get("")
def fetch_workspace_themes() -> WorkspaceThemes:
    return load_workspace_themes()


@admin_router.put("/themes")
def put_workspace_themes(
    workspace_themes: WorkspaceThemes,
    _: User | None = Depends(current_workspace_admin_user),
) -> None:
    try:
        workspace_themes.check_validity()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    store_workspace_themes(workspace_themes)


@admin_router.put("")
def put_settings(
    settings: Settings,
    db: Session = Depends(get_session),
    workspace_id: Optional[int] = 0,  # temporary set to 0
    teamspace_id: Optional[int] = None,
    _: User
    | None = Depends(current_teamspace_admin_user or current_workspace_admin_user),
) -> None:
    try:
        settings.check_validity()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        store_settings(settings, db, workspace_id, teamspace_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@basic_router.get("")
def fetch_settings(
    db_session: Session = Depends(get_session),
    workspace_id: Optional[int] = 0,  # temporary set to 0
    teamspace_id: Optional[int] = None,
    user: User | None = Depends(current_user),
) -> UserSettings:
    """Settings and notifications are stuffed into this single endpoint to reduce number of
    Postgres calls"""
    general_settings = load_settings(db_session, workspace_id, teamspace_id)
    user_notifications = get_user_notifications(user, db_session)

    try:
        kv_store = get_kv_store()
        needs_reindexing = cast(bool, kv_store.load(KV_REINDEX_KEY))
    except KvKeyNotFoundError:
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

    kv_store = get_kv_store()
    try:
        needs_index = cast(bool, kv_store.load(KV_REINDEX_KEY))
        if not needs_index:
            dismiss_all_notifications(
                notif_type=NotificationType.REINDEX, db_session=db_session
            )
            return []
    except KvKeyNotFoundError:
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


@admin_router.put("/workspace/{workspace_id}/smtp")
def update_smtp_settings(
    workspace_id: int,
    smtp_data: SmtpUpdate,
    db: Session = Depends(get_session),
    _: User | None = Depends(current_workspace_admin_user),
):
    workspace = (
        db.query(WorkspaceSettings)
        .filter(WorkspaceSettings.workspace_id == workspace_id)
        .first()
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    update_data = {}
    if smtp_data.smtp_server:
        update_data["smtp_server"] = smtp_data.smtp_server
    if smtp_data.smtp_port:
        update_data["smtp_port"] = smtp_data.smtp_port
    if smtp_data.smtp_username:
        update_data["smtp_username"] = smtp_data.smtp_username
    if smtp_data.smtp_password:
        # Encrypt the password before saving
        encrypted_password = encrypt_password(smtp_data.smtp_password)
        update_data["smtp_password"] = encrypted_password

    # Verify SMTP credentials
    try:
        with smtplib.SMTP(smtp_data.smtp_server, smtp_data.smtp_port) as smtp:
            smtp.starttls()
            smtp.login(smtp_data.smtp_username, smtp_data.smtp_password)
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid SMTP credentials")
    except (smtplib.SMTPException, ConnectionRefusedError) as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to connect to the SMTP server: {str(e)}"
        )

    db.query(WorkspaceSettings).filter(
        WorkspaceSettings.workspace_id == workspace_id
    ).update(update_data)
    db.commit()
    return {"message": "SMTP settings updated and verified successfully"}
