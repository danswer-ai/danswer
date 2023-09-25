from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.bots.slack.tokens import fetch_tokens
from danswer.bots.slack.tokens import save_tokens
from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.db.slack_bot_config import fetch_slack_bot_configs
from danswer.db.slack_bot_config import insert_slack_bot_config
from danswer.db.slack_bot_config import remove_slack_bot_config
from danswer.db.slack_bot_config import update_slack_bot_config
from danswer.server.models import DocumentSet
from danswer.server.models import SlackBotConfig
from danswer.server.models import SlackBotConfigCreationRequest
from danswer.server.models import SlackBotTokens


router = APIRouter(prefix="/manage")


@router.post("/admin/slack-bot/config")
def create_slack_bot_config(
    slack_bot_config_creation_request: SlackBotConfigCreationRequest,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> SlackBotConfig:
    if not slack_bot_config_creation_request.channel_names:
        raise HTTPException(
            status_code=400,
            detail="Must provide at least one channel name",
        )

    channel_config = {
        "channel_names": slack_bot_config_creation_request.channel_names,
    }
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
    if not slack_bot_config_creation_request.channel_names:
        raise HTTPException(
            status_code=400,
            detail="Must provide at least one channel name",
        )

    slack_bot_config_model = update_slack_bot_config(
        slack_bot_config_id=slack_bot_config_id,
        document_sets=slack_bot_config_creation_request.document_sets,
        channel_config={
            "channel_names": slack_bot_config_creation_request.channel_names,
        },
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
    except ValueError:
        raise HTTPException(status_code=404, detail="No tokens found")
