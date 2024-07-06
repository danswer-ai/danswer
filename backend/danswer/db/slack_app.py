from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.db.models import SlackApp
from danswer.db.models import User


def insert_slack_app(
    name: str,
    description: str,
    enabled: bool,
    bot_token: str,
    app_token: str,
    db_session: Session,
) -> SlackApp:
    slack_app = SlackApp(
        name=name,
        description=description,
        enabled=enabled,
        bot_token=bot_token,
        app_token=app_token,
    )
    db_session.add(slack_app)
    db_session.commit()

    return slack_app


def update_slack_app(
    slack_app_id: int,
    name: str,
    description: str,
    enabled: bool,
    bot_token: str,
    app_token: str,
    db_session: Session,
) -> SlackApp:
    slack_app = db_session.scalar(select(SlackApp).where(SlackApp.id == slack_app_id))
    if slack_app is None:
        raise ValueError(f"Unable to find slack app with ID {slack_app_id}")

    # update the app
    slack_app.name = name
    slack_app.description = description
    slack_app.enabled = enabled
    slack_app.bot_token = bot_token
    slack_app.app_token = app_token

    db_session.commit()

    return slack_app


def remove_slack_app(
    slack_app_id: int,
    user: User | None,
    db_session: Session,
) -> None:
    slack_app = db_session.scalar(select(SlackApp).where(SlackApp.id == slack_app_id))
    if slack_app is None:
        raise ValueError(f"Unable to find slack app with ID {slack_app_id}")

    db_session.delete(slack_app)
    db_session.commit()


def fetch_slack_app(db_session: Session, slack_app_id: int) -> SlackApp:
    slack_app = db_session.scalar(select(SlackApp).where(SlackApp.id == slack_app_id))

    if slack_app is None:
        raise ValueError(f"Unable to find slack app with ID {slack_app_id}")

    return slack_app


def fetch_slack_apps(db_session: Session) -> Sequence[SlackApp]:
    return db_session.scalars(select(SlackApp)).all()
