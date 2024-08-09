from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.db.models import Notification
from danswer.db.models import User


def create_notification(
    db_session: Session,
    user: User,
    name: str,
) -> Notification:
    """Create a new notification for a user."""
    now = datetime.utcnow()
    notification = Notification(
        user_id=user.id,
        name=name,
        dismissed=False,
        last_shown=now,
        first_shown=now,
    )
    db_session.add(notification)
    db_session.commit()
    return notification


def get_user_notifications(
    db_session: Session, user: User, include_dismissed: bool = True
) -> list[Notification]:
    """Get all notifications for a user."""
    query = select(Notification).where(Notification.user_id == user.id)
    if not include_dismissed:
        query = query.where(Notification.dismissed.is_(False))
    return list(db_session.execute(query).scalars().all())


def dismiss_notification(db_session: Session, notification_id: int) -> None:
    """Dismiss a notification."""
    notification = db_session.get(Notification, notification_id)
    if notification:
        notification.dismissed = True
        db_session.commit()


def update_notification_last_shown(db_session: Session, notification_id: int) -> None:
    """Update the last_shown timestamp of a notification."""
    notification = db_session.get(Notification, notification_id)
    if notification:
        notification.last_shown = datetime.utcnow()
        db_session.commit()


def delete_notification(db_session: Session, notification_id: int) -> None:
    """Delete a notification."""
    notification = db_session.get(Notification, notification_id)
    if notification:
        db_session.delete(notification)
        db_session.commit()


def get_notification_by_name_and_user(
    db_session: Session, user: User, name: str
) -> Notification | None:
    """Get a notification by its name and user."""
    query = select(Notification).where(
        Notification.user_id == user.id,
        Notification.name == name,
    )
    return db_session.execute(query).scalars().first()


def create_or_update_notification(
    db_session: Session, user: User, name: str
) -> Notification:
    """Create a new notification or update an existing one."""
    notification = get_notification_by_name_and_user(db_session, user, name)
    if notification:
        notification.last_shown = datetime.utcnow()
        notification.dismissed = False
    else:
        notification = create_notification(db_session, user, name)
    db_session.commit()
    return notification
