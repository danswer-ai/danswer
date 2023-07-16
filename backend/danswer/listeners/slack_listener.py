import os

from danswer.configs.app_configs import DANSWER_BOT_NUM_DOCS_TO_DISPLAY
from danswer.configs.app_configs import DANSWER_BOT_NUM_RETRIES
from danswer.configs.app_configs import QDRANT_DEFAULT_COLLECTION
from danswer.configs.constants import DocumentSource
from danswer.connectors.slack.utils import make_slack_api_rate_limited
from danswer.direct_qa.answer_question import answer_question
from danswer.server.models import QAResponse
from danswer.server.models import QuestionRequest
from danswer.server.models import SearchDoc
from danswer.utils.logger import setup_logger
from retry import retry
from slack_sdk import WebClient
from slack_sdk.socket_mode import SocketModeClient
from slack_sdk.socket_mode.request import SocketModeRequest
from slack_sdk.socket_mode.response import SocketModeResponse

logger = setup_logger()


def _get_socket_client() -> SocketModeClient:
    # For more info on how to set this up, checkout the docs:
    # https://docs.danswer.dev/slack_bot_setup
    app_token = os.environ.get("DANSWER_BOT_SLACK_APP_TOKEN")
    if not app_token:
        raise RuntimeError("DANSWER_BOT_SLACK_APP_TOKEN is not set")
    bot_token = os.environ.get("DANSWER_BOT_SLACK_BOT_TOKEN")
    if not bot_token:
        raise RuntimeError("DANSWER_BOT_SLACK_BOT_TOKEN is not set")
    return SocketModeClient(
        # This app-level token will be used only for establishing a connection
        app_token=app_token,
        web_client=WebClient(token=bot_token),
    )


_MAX_BLURB_LEN = 25


def _build_custom_semantic_identifier(
    semantic_identifier: str, blurb: str, source: str
) -> str:
    """
    On slack, since we just show the semantic identifier rather than semantic + blurb, we need
    to do some custom formatting to make sure the semantic identifier is unique and meaningful.
    """
    if source == DocumentSource.SLACK.value:
        truncated_blurb = (
            f"{blurb[:_MAX_BLURB_LEN]}..." if len(blurb) > _MAX_BLURB_LEN else blurb
        )
        if truncated_blurb:
            return f"#{semantic_identifier}: {truncated_blurb}"
        else:
            return f"#{semantic_identifier}"

    return semantic_identifier


def _process_quotes(
    quotes: dict[str, dict[str, str | int | None]] | None
) -> tuple[str | None, list[str]]:
    if not quotes:
        return None, []

    quote_lines: list[str] = []
    doc_identifiers: list[str] = []
    for quote_dict in quotes.values():
        doc_id = str(quote_dict.get("document_id", ""))
        doc_link = quote_dict.get("link")
        doc_name = str(quote_dict.get("semantic_identifier", ""))
        if doc_link and doc_name and doc_id and doc_id not in doc_identifiers:
            doc_identifiers.append(doc_id)
            custom_semantic_identifier = _build_custom_semantic_identifier(
                semantic_identifier=doc_name,
                blurb=str(quote_dict.get("blurb", "")),
                source=str(quote_dict.get("source_type", "")),
            )
            quote_lines.append(f"- <{doc_link}|{custom_semantic_identifier}>")

    if not quote_lines:
        return None, []

    return "\n".join(quote_lines), doc_identifiers


def _process_documents(
    documents: list[SearchDoc] | None,
    already_displayed_doc_identifiers: list[str],
    num_docs_to_display: int = DANSWER_BOT_NUM_DOCS_TO_DISPLAY,
) -> str | None:
    if not documents:
        return None

    seen_docs_identifiers = set(already_displayed_doc_identifiers)
    top_document_lines: list[str] = []
    for d in documents:
        if d.document_id in seen_docs_identifiers:
            continue
        seen_docs_identifiers.add(d.document_id)

        custom_semantic_identifier = _build_custom_semantic_identifier(
            semantic_identifier=d.semantic_identifier,
            blurb=d.blurb,
            source=d.source_type,
        )
        top_document_lines.append(f"- <{d.link}|{custom_semantic_identifier}>")
        if len(top_document_lines) >= num_docs_to_display:
            break

    return "\n".join(top_document_lines)


def process_slack_event(client: SocketModeClient, req: SocketModeRequest) -> None:
    if req.type == "events_api":
        # Acknowledge the request anyway
        response = SocketModeResponse(envelope_id=req.envelope_id)
        client.send_socket_mode_response(response)

        # Ensure that the message is a new message + of expected type
        event_type = req.payload.get("event", {}).get("type")
        if event_type != "message":
            logger.info(f"Ignoring non-message event of type '{event_type}'")

        message_subtype = req.payload.get("event", {}).get("subtype")
        if req.payload.get("event", {}).get("subtype") is not None:
            # this covers things like channel_join, channel_leave, etc.
            logger.info(
                f"Ignoring message with subtype '{message_subtype}' since is is a special message type"
            )
            return

        if req.payload.get("event", {}).get("bot_profile"):
            logger.info("Ignoring message from bot")
            return

        message_ts = req.payload.get("event", {}).get("ts")
        thread_ts = req.payload.get("event", {}).get("thread_ts")
        if thread_ts and message_ts != thread_ts:
            logger.info("Skipping message since it is not the root of a thread")
            return

        msg = req.payload.get("event", {}).get("text")
        if not msg:
            logger.error("Unable to process empty message")
            return

        # TODO: message should be enqueued and processed elsewhere,
        # but doing it here for now for simplicity

        @retry(tries=DANSWER_BOT_NUM_RETRIES, delay=0.25, backoff=2, logger=logger)
        def _get_answer(question: QuestionRequest) -> QAResponse:
            answer = answer_question(question=question, user=None)
            if not answer.error_msg:
                return answer
            else:
                raise RuntimeError(answer.error_msg)

        answer = None
        try:
            answer = _get_answer(
                QuestionRequest(
                    query=req.payload.get("event", {}).get("text"),
                    collection=QDRANT_DEFAULT_COLLECTION,
                    use_keyword=None,
                    filters=None,
                    offset=None,
                )
            )
        except Exception:
            logger.exception(
                f"Unable to process message - did not successfully answer in {DANSWER_BOT_NUM_RETRIES} attempts"
            )
            return

        # convert raw response into "nicely" formatted Slack message
        quote_str, doc_identifiers = _process_quotes(answer.quotes)
        top_documents_str = _process_documents(answer.top_ranked_docs, doc_identifiers)

        if not answer.answer:
            text = f"Sorry, I was unable to find an answer, but I did find some potentially relevant docs 🤓\n\n{top_documents_str}"
        else:
            top_documents_str_with_header = (
                f"*Other potentially relevant docs:*\n{top_documents_str}"
            )
            if quote_str:
                text = f"{answer.answer}\n\n*Sources:*\n{quote_str}\n\n{top_documents_str_with_header}"
            else:
                text = f"{answer.answer}\n\n*Warning*: no sources were quoted for this answer, so it may be unreliable 😔\n\n{top_documents_str_with_header}"

        @retry(tries=DANSWER_BOT_NUM_RETRIES, delay=0.25, backoff=2, logger=logger)
        def _respond_in_thread(
            channel: str,
            text: str,
            thread_ts: str,
        ) -> None:
            slack_call = make_slack_api_rate_limited(client.web_client.chat_postMessage)
            response = slack_call(
                channel=channel,
                text=text,
                thread_ts=thread_ts,
            )
            if not response.get("ok"):
                raise RuntimeError(f"Unable to post message: {response}")

        try:
            _respond_in_thread(
                channel=req.payload.get("event", {}).get("channel"),
                text=text,
                thread_ts=thread_ts
                or message_ts,  # pick the root of the thread (if a thread exists)
            )
        except Exception:
            logger.exception(
                f"Unable to process message - could not respond in slack in {DANSWER_BOT_NUM_RETRIES} attempts"
            )
            return

        logger.info(f"Successfully processed message with ts: '{thread_ts}'")


# Follow the guide (https://docs.danswer.dev/slack_bot_setup) to set up
# the slack bot in your workspace, and then add the bot to any channels you want to
# try and answer questions for. Running this file will setup Danswer to listen to all
# messages in those channels and attempt to answer them. As of now, it will only respond
# to messages sent directly in the channel - it will not respond to messages sent within a
# thread.
#
# NOTE: we are using Web Sockets so that you can run this from within a firewalled VPC
# without issue.
if __name__ == "__main__":
    socket_client = _get_socket_client()
    socket_client.socket_mode_request_listeners.append(process_slack_event)  # type: ignore
    # Establish a WebSocket connection to the Socket Mode servers
    logger.info("Listening for messages from Slack...")
    socket_client.connect()

    # Just not to stop this process
    from threading import Event

    Event().wait()
