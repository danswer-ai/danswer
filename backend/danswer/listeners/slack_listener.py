import os

from danswer.configs.app_configs import QDRANT_DEFAULT_COLLECTION
from danswer.connectors.slack.utils import make_slack_api_rate_limited
from danswer.direct_qa.answer_question import answer_question
from danswer.server.models import QAResponse
from danswer.server.models import QuestionRequest
from danswer.server.models import SearchDoc
from danswer.utils.logging import setup_logger
from slack_sdk import WebClient
from slack_sdk.socket_mode import SocketModeClient
from slack_sdk.socket_mode.request import SocketModeRequest
from slack_sdk.socket_mode.response import SocketModeResponse

logger = setup_logger()

_NUM_RETRIES = 3
_NUM_DOCS_TO_DISPLAY = 5


def _get_socket_client() -> SocketModeClient:
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


def _process_quotes(
    quotes: dict[str, dict[str, str | int | None]] | None
) -> tuple[str | None, list[str]]:
    if not quotes:
        return None, []

    quote_lines: list[str] = []
    doc_identifiers: list[str] = []
    for quote_dict in quotes.values():
        doc_link = quote_dict.get("document_id")
        doc_name = quote_dict.get("semantic_identifier")
        if doc_link and doc_name:
            doc_identifiers.append(str(doc_name))
            quote_lines.append(f"- <{doc_link}|{doc_name}>")

    if not quote_lines:
        return None, []

    return "\n".join(quote_lines), doc_identifiers


def _process_documents(
    documents: list[SearchDoc] | None, already_displayed_doc_identifiers: list[str]
) -> str | None:
    if not documents:
        return None

    top_documents = [
        d
        for d in documents
        if d.semantic_identifier not in already_displayed_doc_identifiers
    ][:_NUM_DOCS_TO_DISPLAY]
    top_documents_str = "\n".join(
        [f"- <{d.link}|{d.semantic_identifier}>" for d in top_documents]
    )
    return "*Other potentially relevant documents:*\n" + top_documents_str


def process_slack_event(client: SocketModeClient, req: SocketModeRequest) -> None:
    if req.type == "events_api":
        # Acknowledge the request anyway
        response = SocketModeResponse(envelope_id=req.envelope_id)
        client.send_socket_mode_response(response)

        # Ensure that the message is a new message + of expected type
        if req.payload.get("event", {}).get("type") != "message":
            logger.info("Ignoring non-message event")

        if req.payload.get("event", {}).get("subtype") is not None:
            # this covers things like channel_join, channel_leave, etc.
            logger.info("Ignoring message since is is a special message type")
            return

        if req.payload.get("event", {}).get("bot_profile"):
            logger.info("Ignoring message from bot")
            return

        msg = req.payload.get("event", {}).get("text")
        thread_ts = req.payload.get("event", {}).get("ts")
        if not msg:
            logger.error("Unable to process empty message")
            return

        # TODO: message should be enqueued and processed elsewhere,
        # but doing it here for now for simplicity

        def _get_answer(question: QuestionRequest) -> QAResponse | None:
            try:
                answer = answer_question(question=question, user=None)
                if not answer.error_msg:
                    return answer
                else:
                    raise RuntimeError(answer.error_msg)
            except Exception as e:
                logger.error(f"Unable to process message: {e}")
            return None

        answer = None
        for _ in range(_NUM_RETRIES):
            answer = _get_answer(
                QuestionRequest(
                    query=req.payload.get("event", {}).get("text"),
                    collection=QDRANT_DEFAULT_COLLECTION,
                    use_keyword=False,
                    filters=None,
                    offset=None,
                )
            )
            if answer:
                break

        if not answer:
            logger.error(
                f"Unable to process message - did not successfully answer in {_NUM_RETRIES} attempts"
            )
            return

        if not answer.answer:
            logger.error(f"Unable to process message - no answer found")
            return

        # convert raw response into "nicely" formatted Slack message
        quote_str, doc_identifiers = _process_quotes(answer.quotes)
        top_documents_str = _process_documents(answer.top_ranked_docs, doc_identifiers)
        if quote_str:
            text = f"{answer.answer}\n\n*Sources:*\n{quote_str}\n\n{top_documents_str}"
        else:
            text = f"{answer.answer}\n\n*Warning*: no sources were quoted for this answer, so it may be unreliable 😔\n\n{top_documents_str}"

        def _respond_in_thread(
            channel: str,
            text: str,
            thread_ts: str,
        ) -> str | None:
            slack_call = make_slack_api_rate_limited(client.web_client.chat_postMessage)
            response = slack_call(
                channel=channel,
                text=text,
                thread_ts=thread_ts,
            )
            if not response.get("ok"):
                return f"Unable to post message: {response}"
            return None

        successfully_answered = False
        for _ in range(_NUM_RETRIES):
            error_msg = _respond_in_thread(
                channel=req.payload.get("event", {}).get("channel"),
                text=text,
                thread_ts=thread_ts,
            )
            if error_msg:
                logger.error(error_msg)
            else:
                successfully_answered = True
                break

        if not successfully_answered:
            logger.error(
                f"Unable to process message - could not respond in slack in {_NUM_RETRIES} attempts"
            )
            return

        logger.info(f"Successfully processed message with ts: '{thread_ts}'")


# Add a new listener to receive messages from Slack
# You can add more listeners like this
if __name__ == "__main__":
    socket_client = _get_socket_client()
    socket_client.socket_mode_request_listeners.append(process_slack_event)  # type: ignore
    # Establish a WebSocket connection to the Socket Mode servers
    logger.info("Listening for messages from Slack...")
    socket_client.connect()

    # Just not to stop this process
    from threading import Event

    Event().wait()
