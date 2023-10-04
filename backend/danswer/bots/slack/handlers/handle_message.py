import logging

from retry import retry
from slack_sdk import WebClient
from sqlalchemy.orm import Session

from danswer.bots.slack.blocks import build_documents_blocks
from danswer.bots.slack.blocks import build_qa_response_blocks
from danswer.bots.slack.blocks import get_restate_blocks
from danswer.bots.slack.config import get_slack_bot_config_for_channel
from danswer.bots.slack.utils import fetch_userids_from_emails
from danswer.bots.slack.utils import get_channel_name_from_id
from danswer.bots.slack.utils import respond_in_thread
from danswer.configs.app_configs import DANSWER_BOT_ANSWER_GENERATION_TIMEOUT
from danswer.configs.app_configs import DANSWER_BOT_DISABLE_DOCS_ONLY_ANSWER
from danswer.configs.app_configs import DANSWER_BOT_DISPLAY_ERROR_MSGS
from danswer.configs.app_configs import DANSWER_BOT_NUM_RETRIES
from danswer.configs.app_configs import (
    DANSWER_BOT_ONLY_ANSWER_WHEN_SLACK_BOT_CONFIG_IS_PRESENT,
)
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
    message_ts_to_respond_to: str | None,
    sender_id: str | None,
    client: WebClient,
    logger: logging.Logger,
    skip_filters: bool = False,
    is_bot_msg: bool = False,
    num_retries: int = DANSWER_BOT_NUM_RETRIES,
    answer_generation_timeout: int = DANSWER_BOT_ANSWER_GENERATION_TIMEOUT,
    should_respond_with_error_msgs: bool = DANSWER_BOT_DISPLAY_ERROR_MSGS,
    disable_docs_only_answer: bool = DANSWER_BOT_DISABLE_DOCS_ONLY_ANSWER,
    only_answer_when_config_is_present: bool = DANSWER_BOT_ONLY_ANSWER_WHEN_SLACK_BOT_CONFIG_IS_PRESENT,
) -> None:
    engine = get_sqlalchemy_engine()
    with Session(engine) as db_session:
        channel_name = get_channel_name_from_id(client=client, channel_id=channel)
        slack_bot_config = get_slack_bot_config_for_channel(
            channel_name=channel_name, db_session=db_session
        )
        if slack_bot_config is None and only_answer_when_config_is_present:
            logger.info(
                "Skipping message since the channel is not configured to use DanswerBot"
            )
            return

        document_set_names: list[str] | None = None
        if slack_bot_config and slack_bot_config.persona:
            document_set_names = [
                document_set.name
                for document_set in slack_bot_config.persona.document_sets
            ]

        reflexion = ENABLE_DANSWERBOT_REFLEXION

        # List of user id to send message to, if None, send to everyone in channel
        send_to: list[str] | None = None
        respond_tag_only = False
        respond_team_member_list = None
        if slack_bot_config and slack_bot_config.channel_config:
            channel_conf = slack_bot_config.channel_config
            if not skip_filters and "answer_filters" in channel_conf:
                reflexion = "well_answered_postfilter" in channel_conf["answer_filters"]

                if (
                    "questionmark_prefilter" in channel_conf["answer_filters"]
                    and "?" not in msg
                ):
                    logger.info(
                        "Skipping message since it does not contain a question mark"
                    )
                    return

            logger.info(
                "Found slack bot config for channel. Restricting bot to use document "
                f"sets: {document_set_names}, "
                f"validity checks enabled: {channel_conf['answer_filters']}"
            )

            respond_tag_only = channel_conf.get("respond_tag_only") or False
            respond_team_member_list = (
                channel_conf.get("respond_team_member_list") or None
            )

        # `skip_filters=True` -> this is a tag, so we *should* respond
        if respond_tag_only and not skip_filters:
            logger.info(
                "Skipping message since the channel is configured such that "
                "DanswerBot only responds to tags"
            )
            return

        if respond_team_member_list:
            send_to = fetch_userids_from_emails(respond_team_member_list, client)

        # If configured to respond to team members only, then cannot be used with a /danswerbot command
        # which would just respond to the sender
        if respond_team_member_list and is_bot_msg:
            if sender_id:
                respond_in_thread(
                    client=client,
                    channel=channel,
                    receiver_ids=[sender_id],
                    text="The DanswerBot slash command is not enabled for this channel",
                    thread_ts=None,
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
                enable_reflexion=reflexion,
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
                receiver_ids=None,
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
                receiver_ids=None,
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

    # If called with the DanswerBot slash command, the question is lost so we have to reshow it
    restate_question_block = get_restate_blocks(msg, is_bot_msg)

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
            receiver_ids=send_to,
            blocks=restate_question_block + answer_blocks + document_blocks,
            thread_ts=message_ts_to_respond_to,
            # don't unfurl, since otherwise we will have 5+ previews which makes the message very long
            unfurl=False,
        )

        # For DM (ephemeral message), we need to create a thread via a normal message so the user can see
        # the ephemeral message. This also will give the user a notification which ephemeral message does not.
        if respond_team_member_list:
            respond_in_thread(
                client=client,
                channel=channel,
                text=(
                    "👋 Hi, we've just gathered and forwarded the relevant "
                    + "information to the team. They'll get back to you shortly!"
                ),
                thread_ts=message_ts_to_respond_to,
            )

    except Exception:
        logger.exception(
            f"Unable to process message - could not respond in slack in {num_retries} attempts"
        )
        return
