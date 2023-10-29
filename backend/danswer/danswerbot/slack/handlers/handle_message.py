import logging
from typing import cast

from retry import retry
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from sqlalchemy.orm import Session

from danswer.configs.app_configs import DOCUMENT_INDEX_NAME
from danswer.configs.danswerbot_configs import DANSWER_BOT_ANSWER_GENERATION_TIMEOUT
from danswer.configs.danswerbot_configs import DANSWER_BOT_DISABLE_DOCS_ONLY_ANSWER
from danswer.configs.danswerbot_configs import DANSWER_BOT_DISPLAY_ERROR_MSGS
from danswer.configs.danswerbot_configs import DANSWER_BOT_NUM_RETRIES
from danswer.configs.danswerbot_configs import DANSWER_REACT_EMOJI
from danswer.configs.danswerbot_configs import DISABLE_DANSWER_BOT_FILTER_DETECT
from danswer.configs.danswerbot_configs import ENABLE_DANSWERBOT_REFLEXION
from danswer.connectors.slack.utils import make_slack_api_rate_limited
from danswer.danswerbot.slack.blocks import build_documents_blocks
from danswer.danswerbot.slack.blocks import build_qa_response_blocks
from danswer.danswerbot.slack.blocks import get_restate_blocks
from danswer.danswerbot.slack.constants import SLACK_CHANNEL_ID
from danswer.danswerbot.slack.models import SlackMessageInfo
from danswer.danswerbot.slack.utils import ChannelIdAdapter
from danswer.danswerbot.slack.utils import fetch_userids_from_emails
from danswer.danswerbot.slack.utils import respond_in_thread
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.models import SlackBotConfig
from danswer.direct_qa.answer_question import answer_qa_query
from danswer.search.models import BaseFilters
from danswer.server.models import QAResponse
from danswer.server.models import QuestionRequest
from danswer.utils.logger import setup_logger

logger_base = setup_logger()


def send_msg_ack_to_user(details: SlackMessageInfo, client: WebClient) -> None:
    if details.is_bot_msg and details.sender:
        respond_in_thread(
            client=client,
            channel=details.channel_to_respond,
            thread_ts=details.msg_to_respond,
            receiver_ids=[details.sender],
            text="Hi, we're evaluating your query :face_with_monocle:",
        )
        return

    slack_call = make_slack_api_rate_limited(client.reactions_add)
    slack_call(
        name=DANSWER_REACT_EMOJI,
        channel=details.channel_to_respond,
        timestamp=details.msg_to_respond,
    )


def remove_react(details: SlackMessageInfo, client: WebClient) -> None:
    if details.is_bot_msg:
        return

    slack_call = make_slack_api_rate_limited(client.reactions_remove)
    slack_call(
        name=DANSWER_REACT_EMOJI,
        channel=details.channel_to_respond,
        timestamp=details.msg_to_respond,
    )


def handle_message(
    message_info: SlackMessageInfo,
    channel_config: SlackBotConfig | None,
    client: WebClient,
    num_retries: int = DANSWER_BOT_NUM_RETRIES,
    answer_generation_timeout: int = DANSWER_BOT_ANSWER_GENERATION_TIMEOUT,
    should_respond_with_error_msgs: bool = DANSWER_BOT_DISPLAY_ERROR_MSGS,
    disable_docs_only_answer: bool = DANSWER_BOT_DISABLE_DOCS_ONLY_ANSWER,
    disable_auto_detect_filters: bool = DISABLE_DANSWER_BOT_FILTER_DETECT,
    reflexion: bool = ENABLE_DANSWERBOT_REFLEXION,
) -> bool:
    """Potentially respond to the user message depending on filters and if an answer was generated

    Returns True if need to respond with an additional message to the user(s) after this
    function is finished. True indicates an unexpected failure that needs to be communicated
    Query thrown out by filters due to config does not count as a failure that should be notified
    Danswer failing to answer/retrieve docs does count and should be notified
    """
    msg = message_info.msg_content
    channel = message_info.channel_to_respond
    message_ts_to_respond_to = message_info.msg_to_respond
    sender_id = message_info.sender
    bipass_filters = message_info.bipass_filters
    is_bot_msg = message_info.is_bot_msg

    logger = cast(
        logging.Logger,
        ChannelIdAdapter(logger_base, extra={SLACK_CHANNEL_ID: channel}),
    )

    document_set_names: list[str] | None = None
    if channel_config and channel_config.persona:
        document_set_names = [
            document_set.name for document_set in channel_config.persona.document_sets
        ]

    # List of user id to send message to, if None, send to everyone in channel
    send_to: list[str] | None = None
    respond_tag_only = False
    respond_team_member_list = None
    if channel_config and channel_config.channel_config:
        channel_conf = channel_config.channel_config
        if not bipass_filters and "answer_filters" in channel_conf:
            reflexion = "well_answered_postfilter" in channel_conf["answer_filters"]

            if (
                "questionmark_prefilter" in channel_conf["answer_filters"]
                and "?" not in msg
            ):
                logger.info(
                    "Skipping message since it does not contain a question mark"
                )
                return False

        logger.info(
            "Found slack bot config for channel. Restricting bot to use document "
            f"sets: {document_set_names}, "
            f"validity checks enabled: {channel_conf.get('answer_filters', 'NA')}"
        )

        respond_tag_only = channel_conf.get("respond_tag_only") or False
        respond_team_member_list = channel_conf.get("respond_team_member_list") or None

    if respond_tag_only and not bipass_filters:
        logger.info(
            "Skipping message since the channel is configured such that "
            "DanswerBot only responds to tags"
        )
        return False

    if respond_team_member_list:
        send_to = fetch_userids_from_emails(respond_team_member_list, client)

    # If configured to respond to team members only, then cannot be used with a /DanswerBot command
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

    try:
        send_msg_ack_to_user(message_info, client)
    except SlackApiError as e:
        logger.error(f"Was not able to react to user message due to: {e}")

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

    answer_failed = False
    try:
        # By leaving time_cutoff and favor_recent as None, and setting enable_auto_detect_filters
        # it allows the slack flow to extract out filters from the user query
        filters = BaseFilters(
            source_type=None,
            document_set=document_set_names,
            time_cutoff=None,
        )

        # This includes throwing out answer via reflexion
        answer = _get_answer(
            QuestionRequest(
                query=msg,
                collection=DOCUMENT_INDEX_NAME,
                enable_auto_detect_filters=not disable_auto_detect_filters,
                filters=filters,
                favor_recent=None,
                offset=None,
            )
        )
    except Exception as e:
        answer_failed = True
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

    try:
        remove_react(message_info, client)
    except SlackApiError as e:
        logger.error(f"Failed to remove Reaction due to: {e}")

    if answer_failed:
        return True

    if answer.eval_res_valid is False:
        logger.info(
            "Answer was evaluated to be invalid, throwing it away without responding."
        )
        if answer.answer:
            logger.debug(answer.answer)
        return True

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
        return True

    if not answer.answer and disable_docs_only_answer:
        logger.info(
            "Unable to find answer - not responding since the "
            "`DANSWER_BOT_DISABLE_DOCS_ONLY_ANSWER` env variable is set"
        )
        return True

    # If called with the DanswerBot slash command, the question is lost so we have to reshow it
    restate_question_block = get_restate_blocks(msg, is_bot_msg)

    answer_blocks = build_qa_response_blocks(
        query_event_id=answer.query_event_id,
        answer=answer.answer,
        quotes=answer.quotes,
        time_cutoff=answer.time_cutoff,
        favor_recent=answer.favor_recent,
    )

    document_blocks = build_documents_blocks(
        documents=answer.top_ranked_docs, query_event_id=answer.query_event_id
    )

    try:
        respond_in_thread(
            client=client,
            channel=channel,
            receiver_ids=send_to,
            text="Hello! Danswer has some results for you!",
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

        return False

    except Exception:
        logger.exception(
            f"Unable to process message - could not respond in slack in {num_retries} attempts"
        )
        return True
