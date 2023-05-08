from datetime import datetime

from danswer.configs.constants import DocumentSource
from danswer.connectors.models import InputType
from danswer.connectors.slack.config import get_slack_config
from danswer.connectors.slack.config import SlackConfig
from danswer.connectors.slack.config import update_slack_config
from danswer.db.index_attempt import fetch_index_attempts
from danswer.db.index_attempt import insert_index_attempt
from danswer.db.models import IndexAttempt
from danswer.db.models import IndexingStatus
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.utils.logging import setup_logger
from fastapi import APIRouter
from fastapi import HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/admin")

logger = setup_logger()


@router.get("/connectors/slack/config", response_model=SlackConfig)
def fetch_slack_config():
    try:
        return get_slack_config()
    except ConfigNotFoundError:
        return SlackConfig(slack_bot_token="", workspace_id="")


@router.post("/connectors/slack/config")
def modify_slack_config(slack_config: SlackConfig):
    update_slack_config(slack_config)


class WebIndexAttemptRequest(BaseModel):
    url: str


@router.post("/connectors/web/index-attempt", status_code=201)
def index_website(web_index_attempt_request: WebIndexAttemptRequest) -> None:
    index_request = IndexAttempt(
        source=DocumentSource.WEB,
        input_type=InputType.PULL,
        connector_specific_config={"url": web_index_attempt_request.url},
        status=IndexingStatus.NOT_STARTED,
    )
    insert_index_attempt(index_request)


class IndexAttemptSnapshot(BaseModel):
    url: str
    status: IndexingStatus
    time_created: datetime
    time_updated: datetime
    docs_indexed: int


class ListWebsiteIndexAttemptsResponse(BaseModel):
    index_attempts: list[IndexAttemptSnapshot]


@router.get("/connectors/web/index-attempt")
def list_website_index_attempts() -> ListWebsiteIndexAttemptsResponse:
    index_attempts = fetch_index_attempts(sources=[DocumentSource.WEB])
    return ListWebsiteIndexAttemptsResponse(
        index_attempts=[
            IndexAttemptSnapshot(
                url=index_attempt.connector_specific_config["url"],
                status=index_attempt.status,
                time_created=index_attempt.time_created,
                time_updated=index_attempt.time_updated,
                docs_indexed=0
                if not index_attempt.document_ids
                else len(index_attempt.document_ids),
            )
            for index_attempt in index_attempts
        ]
    )
