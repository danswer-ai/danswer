from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.bots.slack.config import validate_channel_names
from danswer.bots.slack.tokens import fetch_tokens
from danswer.bots.slack.tokens import save_tokens
from danswer.db.engine import get_session
from danswer.db.models import ChannelConfig
from danswer.db.models import User
from danswer.db.slack_bot_config import fetch_slack_bot_configs
from danswer.db.slack_bot_config import insert_slack_bot_config
from danswer.db.slack_bot_config import remove_slack_bot_config
from danswer.db.slack_bot_config import update_slack_bot_config
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.server.models import DocumentSet
from danswer.server.models import SlackBotConfig
from danswer.server.models import SlackBotConfigCreationRequest
from danswer.server.models import SlackBotTokens


router = APIRouter(prefix="/manage")


def _form_channel_config(
    slack_bot_config_creation_request: SlackBotConfigCreationRequest,
    current_slack_bot_config_id: int | None,
    db_session: Session,
) -> ChannelConfig:
    raw_channel_names = slack_bot_config_creation_request.channel_names
    respond_tag_only = slack_bot_config_creation_request.respond_tag_only
    respond_team_member_list = (
        slack_bot_config_creation_request.respond_team_member_list
    )
    answer_filters = slack_bot_config_creation_request.answer_filters

    if not raw_channel_names:
        raise HTTPException(
            status_code=400,
            detail="Must provide at least one channel name",
        )

    try:
        cleaned_channel_names = validate_channel_names(
            channel_names=raw_channel_names,
            current_slack_bot_config_id=current_slack_bot_config_id,
            db_session=db_session,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    if respond_tag_only and respond_team_member_list:
        raise ValueError(
            "Cannot set DanswerBot to only respond to tags only and "
            "also respond to a predetermined set of users."
        )

    channel_config: ChannelConfig = {
        "channel_names": cleaned_channel_names,
    }
    if respond_tag_only is not None:
        channel_config["respond_tag_only"] = respond_tag_only
    if respond_team_member_list:
        channel_config["respond_team_member_list"] = respond_team_member_list
    if answer_filters:
        channel_config["answer_filters"] = answer_filters

    return channel_config


@router.post("/admin/slack-bot/config")
def create_slack_bot_config(
    slack_bot_config_creation_request: SlackBotConfigCreationRequest,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> SlackBotConfig:
    channel_config = _form_channel_config(
        slack_bot_config_creation_request, None, db_session
    )

    slack_bot_config_model = insert_slack_bot_config(
        document_sets=slack_bot_config_creation_request.document_sets,
        channel_config=channel_config,
        db_session=db_session,
    )
    return SlackBotConfig(
        id=slack_bot_config_model.id,
        document_sets=[
            DocumentSet.from_model(document_set)
            for document_set in slack_bot_config_model.persona.document_sets
        ]
        if slack_bot_config_model.persona
        else [],
        channel_config=slack_bot_config_model.channel_config,
    )


@router.patch("/admin/slack-bot/config/{slack_bot_config_id}")
def patch_slack_bot_config(
    slack_bot_config_id: int,
    slack_bot_config_creation_request: SlackBotConfigCreationRequest,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> SlackBotConfig:
    channel_config = _form_channel_config(
        slack_bot_config_creation_request, slack_bot_config_id, db_session
    )

    slack_bot_config_model = update_slack_bot_config(
        slack_bot_config_id=slack_bot_config_id,
        document_sets=slack_bot_config_creation_request.document_sets,
        channel_config=channel_config,
        db_session=db_session,
    )
    return SlackBotConfig(
        id=slack_bot_config_model.id,
        document_sets=[
            DocumentSet.from_model(document_set)
            for document_set in slack_bot_config_model.persona.document_sets
        ]
        if slack_bot_config_model.persona
        else [],
        channel_config=slack_bot_config_model.channel_config,
    )


@router.delete("/admin/slack-bot/config/{slack_bot_config_id}")
def delete_slack_bot_config(
    slack_bot_config_id: int,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> None:
    remove_slack_bot_config(
        slack_bot_config_id=slack_bot_config_id, db_session=db_session
    )


@router.get("/admin/slack-bot/config")
def list_slack_bot_configs(
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> list[SlackBotConfig]:
    slack_bot_config_models = fetch_slack_bot_configs(db_session=db_session)
    return [
        SlackBotConfig(
            id=slack_bot_config_model.id,
            document_sets=[
                DocumentSet.from_model(document_set)
                for document_set in slack_bot_config_model.persona.document_sets
            ]
            if slack_bot_config_model.persona
            else [],
            channel_config=slack_bot_config_model.channel_config,
        )
        for slack_bot_config_model in slack_bot_config_models
    ]


@router.put("/admin/slack-bot/tokens")
def put_tokens(tokens: SlackBotTokens) -> None:
    save_tokens(tokens=tokens)


@router.get("/admin/slack-bot/tokens")
def get_tokens() -> SlackBotTokens:
    try:
        return fetch_tokens()
    except ConfigNotFoundError:
        raise HTTPException(status_code=404, detail="No tokens found")
