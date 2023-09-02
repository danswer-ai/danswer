import logging

from retry import retry
from slack_sdk import WebClient
from sqlalchemy.orm import Session

from danswer.bots.slack.blocks import build_qa_response_blocks
from danswer.bots.slack.utils import respond_in_thread
from danswer.configs.app_configs import DANSWER_BOT_ANSWER_GENERATION_TIMEOUT
from danswer.configs.app_configs import DANSWER_BOT_DISABLE_DOCS_ONLY_ANSWER
from danswer.configs.app_configs import DANSWER_BOT_DISPLAY_ERROR_MSGS
from danswer.configs.app_configs import DANSWER_BOT_NUM_RETRIES
from danswer.configs.app_configs import DOCUMENT_INDEX_NAME
from danswer.db.engine import get_sqlalchemy_engine
from danswer.direct_qa.answer_question import answer_qa_query
from danswer.server.models import QAResponse
from danswer.server.models import QuestionRequest


def handle_message(
    msg: str,
    channel: str,
    message_ts_to_respond_to: str,
    client: WebClient,
    logger: logging.Logger,
    num_retries: int = DANSWER_BOT_NUM_RETRIES,
    answer_generation_timeout: int = DANSWER_BOT_ANSWER_GENERATION_TIMEOUT,
    should_respond_with_error_msgs: bool = DANSWER_BOT_DISPLAY_ERROR_MSGS,
    disable_docs_only_answer: bool = DANSWER_BOT_DISABLE_DOCS_ONLY_ANSWER,
) -> None:
    @retry(
        tries=num_retries,
        delay=0.25,
        backoff=2,
        logger=logger,
    )
    def _get_answer(question: QuestionRequest) -> QAResponse:
        engine = get_sqlalchemy_engine()
        with Session(engine, expire_on_commit=False) as db_session:
            answer = answer_qa_query(
                question=question,
                user=None,
                db_session=db_session,
                answer_generation_timeout=answer_generation_timeout,
            )
            if not answer.error_msg:
                return answer
            else:
                raise RuntimeError(answer.error_msg)

    try:
        answer = _get_answer(
            QuestionRequest(
                query=msg,
                collection=DOCUMENT_INDEX_NAME,
                use_keyword=False,  # always use semantic search when handling slack messages
                filters=None,
                offset=None,
            )
        )
    except Exception as e:
        logger.exception(
            f"Unable to process message - did not successfully answer "
            f"in {num_retries} attempts"
        )
        # Optionally, respond in thread with the error message, Used primarily
        # for debugging purposes
        if should_respond_with_error_msgs:
            respond_in_thread(
                client=client,
                channel=channel,
                text=f"Encountered exception when trying to answer: \n\n```{e}```",
                thread_ts=message_ts_to_respond_to,
            )
        return

    if not answer.top_ranked_docs:
        logger.error(f"Unable to answer question: '{msg}' - no documents found")
        # Optionally, respond in thread with the error message, Used primarily
        # for debugging purposes
        if should_respond_with_error_msgs:
            respond_in_thread(
                client=client,
                channel=channel,
                text="Found no documents when trying to answer. Did you index any documents?",
                thread_ts=message_ts_to_respond_to,
            )
        return

    if not answer.answer and disable_docs_only_answer:
        logger.info(
            "Unable to find answer - not responding since the "
            "`DANSWER_BOT_DISABLE_DOCS_ONLY_ANSWER` env variable is set"
        )
        return

    # convert raw response into "nicely" formatted Slack message
    blocks = build_qa_response_blocks(
        query_event_id=answer.query_event_id,
        answer=answer.answer,
        documents=answer.top_ranked_docs,
        quotes=answer.quotes,
    )
    try:
        respond_in_thread(
            client=client,
            channel=channel,
            blocks=blocks,
            thread_ts=message_ts_to_respond_to,
        )
    except Exception:
        logger.exception(
            f"Unable to process message - could not respond in slack in {num_retries} attempts"
        )
        return
