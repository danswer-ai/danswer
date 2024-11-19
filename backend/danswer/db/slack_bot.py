from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.db.models import SlackBot
from danswer.db.models import User


def insert_slack_bot(
    name: str,
    description: str,
    enabled: bool,
    bot_token: str,
    app_token: str,
    db_session: Session,
) -> SlackBot:
    slack_bot = SlackBot(
        name=name,
        description=description,
        enabled=enabled,
        bot_token=bot_token,
        app_token=app_token,
    )
    db_session.add(slack_bot)
    db_session.commit()

    return slack_bot


def update_slack_bot(
    slack_bot_id: int,
    name: str,
    description: str,
    enabled: bool,
    bot_token: str,
    app_token: str,
    db_session: Session,
) -> SlackBot:
    slack_bot = db_session.scalar(select(SlackBot).where(SlackBot.id == slack_bot_id))
    if slack_bot is None:
        raise ValueError(f"Unable to find slack app with ID {slack_bot_id}")

    # update the app
    slack_bot.name = name
    slack_bot.description = description
    slack_bot.enabled = enabled
    slack_bot.bot_token = bot_token
    slack_bot.app_token = app_token

    db_session.commit()

    return slack_bot


def remove_slack_bot(
    slack_bot_id: int,
    user: User | None,
    db_session: Session,
) -> None:
    slack_bot = db_session.scalar(select(SlackBot).where(SlackBot.id == slack_bot_id))
    if slack_bot is None:
        raise ValueError(f"Unable to find slack app with ID {slack_bot_id}")

    db_session.delete(slack_bot)
    db_session.commit()


def fetch_slack_bot(db_session: Session, slack_bot_id: int) -> SlackBot:
    slack_bot = db_session.scalar(select(SlackBot).where(SlackBot.id == slack_bot_id))

    if slack_bot is None:
        raise ValueError(f"Unable to find slack app with ID {slack_bot_id}")

    return slack_bot


def fetch_slack_bots(db_session: Session) -> Sequence[SlackBot]:
    return db_session.scalars(select(SlackBot)).all()