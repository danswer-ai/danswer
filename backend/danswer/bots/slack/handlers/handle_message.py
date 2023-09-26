import logging

from retry import retry
from slack_sdk import WebClient
from sqlalchemy.orm import Session

from danswer.bots.slack.blocks import build_documents_blocks
from danswer.bots.slack.blocks import build_qa_response_blocks
from danswer.bots.slack.config import get_slack_bot_config_for_channel
from danswer.bots.slack.utils import get_channel_name_from_id
from danswer.bots.slack.utils import respond_in_thread
from danswer.configs.app_configs import DANSWER_BOT_ANSWER_GENERATION_TIMEOUT
from danswer.configs.app_configs import DANSWER_BOT_DISABLE_DOCS_ONLY_ANSWER
from danswer.configs.app_configs import DANSWER_BOT_DISPLAY_ERROR_MSGS
from danswer.configs.app_configs import DANSWER_BOT_NUM_RETRIES
from danswer.configs.app_configs import DOCUMENT_INDEX_NAME
from danswer.configs.app_configs import ENABLE_DANSWERBOT_REFLEXION
from danswer.configs.constants import DOCUMENT_SETS
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
    engine = get_sqlalchemy_engine()
    with Session(engine) as db_session:
        channel_name = get_channel_name_from_id(client=client, channel_id=channel)
        slack_bot_config = get_slack_bot_config_for_channel(
            channel_name=channel_name, db_session=db_session
        )
        document_set_names: list[str] | None = None
        validity_check_enabled = ENABLE_DANSWERBOT_REFLEXION
        if slack_bot_config and slack_bot_config.persona:
            document_set_names = [
                document_set.name
                for document_set in slack_bot_config.persona.document_sets
            ]
            validity_check_enabled = slack_bot_config.channel_config.get(
                "answer_validity_check_enabled", validity_check_enabled
            )
            logger.info(
                "Found slack bot config for channel. Restricting bot to use document "
                f"sets: {document_set_names}, validity check enabled: {validity_check_enabled}"
            )

    @retry(
        tries=num_retries,
        delay=0.25,
        backoff=2,
        logger=logger,
    )
    def _get_answer(question: QuestionRequest) -> QAResponse:
        engine = get_sqlalchemy_engine()
        with Session(engine, expire_on_commit=False) as db_session:
            # This also handles creating the query event in postgres
            answer = answer_qa_query(
                question=question,
                user=None,
                db_session=db_session,
                answer_generation_timeout=answer_generation_timeout,
                real_time_flow=False,
                enable_reflexion=validity_check_enabled,
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
                use_keyword=False,  # always use semantic search when handling Slack messages
                filters=[{DOCUMENT_SETS: document_set_names}]
                if document_set_names
                else None,
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

    if answer.eval_res_valid is False:
        logger.info(
            "Answer was evaluated to be invalid, throwing it away without responding."
        )
        if answer.answer:
            logger.debug(answer.answer)
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
    answer_blocks = build_qa_response_blocks(
        query_event_id=answer.query_event_id,
        answer=answer.answer,
        quotes=answer.quotes,
    )

    document_blocks = build_documents_blocks(
        documents=answer.top_ranked_docs, query_event_id=answer.query_event_id
    )

    try:
        respond_in_thread(
            client=client,
            channel=channel,
            blocks=answer_blocks + document_blocks,
            thread_ts=message_ts_to_respond_to,
            # don't unfurl, since otherwise we will have 5+ previews which makes the message very long
            unfurl=False,
        )

    except Exception:
        logger.exception(
            f"Unable to process message - could not respond in slack in {num_retries} attempts"
        )
        return
