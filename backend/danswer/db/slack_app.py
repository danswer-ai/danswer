from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

# from danswer.configs.chat_configs import MAX_CHUNKS_FED_TO_CHAT
# from danswer.db.constants import SLACK_BOT_PERSONA_PREFIX
# from danswer.db.document_set import get_document_sets_by_ids
# from danswer.db.models import ChannelConfig
# from danswer.db.models import Persona
# from danswer.db.models import Persona__DocumentSet
# from danswer.db.models import SlackBotConfig
# from danswer.db.models import SlackBotResponseType
from danswer.db.models import User
# from danswer.db.persona import get_default_prompt
# from danswer.db.persona import mark_persona_as_deleted
# from danswer.db.persona import upsert_persona
# from danswer.search.enums import RecencyBiasSetting

from danswer.db.models import SlackApp

# def _build_persona_name(channel_names: list[str]) -> str:
#     return f"{SLACK_BOT_PERSONA_PREFIX}{'-'.join(channel_names)}"


# def _cleanup_relationships(db_session: Session, persona_id: int) -> None:
#     """NOTE: does not commit changes"""
#     # delete existing persona-document_set relationships
#     existing_relationships = db_session.scalars(
#         select(Persona__DocumentSet).where(
#             Persona__DocumentSet.persona_id == persona_id
#         )
#     )
#     for rel in existing_relationships:
#         db_session.delete(rel)


# def create_slack_bot_persona(
#     db_session: Session,
#     channel_names: list[str],
#     document_set_ids: list[int],
#     existing_persona_id: int | None = None,
#     num_chunks: float = MAX_CHUNKS_FED_TO_CHAT,
# ) -> Persona:
#     """NOTE: does not commit changes"""
#     document_sets = list(
#         get_document_sets_by_ids(
#             document_set_ids=document_set_ids,
#             db_session=db_session,
#         )
#     )

#     # create/update persona associated with the slack bot
#     persona_name = _build_persona_name(channel_names)
#     default_prompt = get_default_prompt(db_session)
#     persona = upsert_persona(
#         user=None,  # Slack Bot Personas are not attached to users
#         persona_id=existing_persona_id,
#         name=persona_name,
#         description="",
#         num_chunks=num_chunks,
#         llm_relevance_filter=True,
#         llm_filter_extraction=True,
#         recency_bias=RecencyBiasSetting.AUTO,
#         prompts=[default_prompt],
#         document_sets=document_sets,
#         llm_model_provider_override=None,
#         llm_model_version_override=None,
#         starter_messages=None,
#         is_public=True,
#         default_persona=False,
#         db_session=db_session,
#         commit=False,
#     )

#     return persona


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
        app_token=app_token
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
    slack_app = db_session.scalar(
        select(SlackApp).where(SlackApp.id == slack_app_id)
    )
    if slack_app is None:
        raise ValueError(
            f"Unable to find slack app with ID {slack_app_id}"
        )
    
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
    slack_app = db_session.scalar(
        select(SlackApp).where(SlackApp.id == slack_app_id)
    )
    if slack_app is None:
        raise ValueError(
            f"Unable to find slack app with ID {slack_app_id}"
        )

    db_session.delete(slack_app)
    db_session.commit()


def fetch_slack_app(
    db_session: Session, slack_app_id: int
) -> SlackApp | None:
    return db_session.scalar(
        select(SlackApp).where(SlackApp.id == slack_app_id)
    )


def fetch_slack_apps(db_session: Session) -> Sequence[SlackApp]:
    return db_session.scalars(select(SlackApp)).all()
