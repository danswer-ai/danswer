from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.db.chat import upsert_persona
from danswer.db.constants import SLACK_BOT_PERSONA_PREFIX
from danswer.db.models import ChannelConfig
from danswer.db.models import Persona
from danswer.db.models import Persona__DocumentSet
from danswer.db.models import SlackBotConfig


def _build_persona_name(channel_names: list[str]) -> str:
    return f"{SLACK_BOT_PERSONA_PREFIX}{'-'.join(channel_names)}"


def _cleanup_relationships(db_session: Session, persona_id: int) -> None:
    """NOTE: does not commit changes"""
    # delete existing persona-document_set relationships
    existing_relationships = db_session.scalars(
        select(Persona__DocumentSet).where(
            Persona__DocumentSet.persona_id == persona_id
        )
    )
    for rel in existing_relationships:
        db_session.delete(rel)


def create_slack_bot_persona(
    db_session: Session,
    channel_names: list[str],
    document_sets: list[int],
    existing_persona_id: int | None = None,
) -> Persona:
    """NOTE: does not commit changes"""
    # create/update persona associated with the slack bot
    persona_name = _build_persona_name(channel_names)
    persona = upsert_persona(
        persona_id=existing_persona_id,
        name=persona_name,
        datetime_aware=False,
        retrieval_enabled=True,
        system_text=None,
        tools=None,
        hint_text=None,
        default_persona=False,
        db_session=db_session,
        commit=False,
        overwrite_duplicate_named_persona=True,
    )

    if existing_persona_id:
        _cleanup_relationships(db_session=db_session, persona_id=existing_persona_id)

    # create relationship between the new persona and the desired document_sets
    for document_set_id in document_sets:
        db_session.add(
            Persona__DocumentSet(persona_id=persona.id, document_set_id=document_set_id)
        )

    return persona


def insert_slack_bot_config(
    persona_id: int | None,
    channel_config: ChannelConfig,
    db_session: Session,
) -> SlackBotConfig:
    slack_bot_config = SlackBotConfig(
        persona_id=persona_id,
        channel_config=channel_config,
    )
    db_session.add(slack_bot_config)
    db_session.commit()

    return slack_bot_config


def update_slack_bot_config(
    slack_bot_config_id: int,
    persona_id: int | None,
    channel_config: ChannelConfig,
    db_session: Session,
) -> SlackBotConfig:
    slack_bot_config = db_session.scalar(
        select(SlackBotConfig).where(SlackBotConfig.id == slack_bot_config_id)
    )
    if slack_bot_config is None:
        raise ValueError(
            f"Unable to find slack bot config with ID {slack_bot_config_id}"
        )
    # get the existing persona id before updating the object
    existing_persona_id = slack_bot_config.persona_id

    # update the config
    # NOTE: need to do this before cleaning up the old persona or else we
    # will encounter `violates foreign key constraint` errors
    slack_bot_config.persona_id = persona_id
    slack_bot_config.channel_config = channel_config

    # if the persona has changed, then clean up the old persona
    if persona_id != existing_persona_id and existing_persona_id:
        existing_persona = db_session.scalar(
            select(Persona).where(Persona.id == existing_persona_id)
        )
        # if the existing persona was one created just for use with this Slack Bot,
        # then clean it up
        if existing_persona and existing_persona.name.startswith(
            SLACK_BOT_PERSONA_PREFIX
        ):
            _cleanup_relationships(
                db_session=db_session, persona_id=existing_persona_id
            )

    db_session.commit()

    return slack_bot_config


def remove_slack_bot_config(
    slack_bot_config_id: int,
    db_session: Session,
) -> None:
    slack_bot_config = db_session.scalar(
        select(SlackBotConfig).where(SlackBotConfig.id == slack_bot_config_id)
    )
    if slack_bot_config is None:
        raise ValueError(
            f"Unable to find slack bot config with ID {slack_bot_config_id}"
        )

    existing_persona_id = slack_bot_config.persona_id
    if existing_persona_id:
        existing_persona = db_session.scalar(
            select(Persona).where(Persona.id == existing_persona_id)
        )
        # if the existing persona was one created just for use with this Slack Bot,
        # then clean it up
        if existing_persona and existing_persona.name.startswith(
            SLACK_BOT_PERSONA_PREFIX
        ):
            _cleanup_relationships(
                db_session=db_session, persona_id=existing_persona_id
            )
            db_session.delete(existing_persona)

    db_session.delete(slack_bot_config)
    db_session.commit()


def fetch_slack_bot_config(
    db_session: Session, slack_bot_config_id: int
) -> SlackBotConfig | None:
    return db_session.scalar(
        select(SlackBotConfig).where(SlackBotConfig.id == slack_bot_config_id)
    )


def fetch_slack_bot_configs(db_session: Session) -> Sequence[SlackBotConfig]:
    return db_session.scalars(select(SlackBotConfig)).all()
