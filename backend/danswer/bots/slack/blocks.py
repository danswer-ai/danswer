from slack_sdk.models.blocks import ActionsBlock
from slack_sdk.models.blocks import Block
from slack_sdk.models.blocks import ButtonElement
from slack_sdk.models.blocks import SectionBlock

from danswer.bots.slack.constants import DISLIKE_BLOCK_ACTION_ID
from danswer.bots.slack.constants import LIKE_BLOCK_ACTION_ID
from danswer.bots.slack.utils import build_block_id_from_query_event_id
from danswer.configs.app_configs import DANSWER_BOT_NUM_DOCS_TO_DISPLAY
from danswer.configs.constants import DocumentSource
from danswer.connectors.slack.utils import UserIdReplacer
from danswer.direct_qa.interfaces import DanswerQuote
from danswer.server.models import SearchDoc


def build_feedback_block(query_event_id: int) -> Block:
    return ActionsBlock(
        block_id=build_block_id_from_query_event_id(query_event_id),
        elements=[
            ButtonElement(
                action_id=LIKE_BLOCK_ACTION_ID,
                text="👍",
                style="primary",
            ),
            ButtonElement(
                action_id=DISLIKE_BLOCK_ACTION_ID,
                text="👎",
                style="danger",
            ),
        ],
    )


_MAX_BLURB_LEN = 75


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
        # NOTE: removing tags so that we don't accidentally tag users in Slack +
        # so that it can be used as part of a <link|text> link
        truncated_blurb = UserIdReplacer.replace_tags_basic(truncated_blurb)
        truncated_blurb = UserIdReplacer.replace_channels_basic(truncated_blurb)
        truncated_blurb = UserIdReplacer.replace_special_mentions(truncated_blurb)
        if truncated_blurb:
            return f"#{semantic_identifier}: {truncated_blurb}"
        else:
            return f"#{semantic_identifier}"

    return semantic_identifier


def build_documents_block(
    documents: list[SearchDoc],
    already_displayed_doc_identifiers: list[str],
    num_docs_to_display: int = DANSWER_BOT_NUM_DOCS_TO_DISPLAY,
) -> SectionBlock:
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

    return SectionBlock(
        fields=[
            "*Other potentially relevant docs:*",
            *top_document_lines,
        ]
    )


def build_quotes_block(
    quotes: list[DanswerQuote],
) -> tuple[list[Block], list[str]]:
    quote_lines: list[str] = []
    doc_identifiers: list[str] = []
    for quote in quotes:
        doc_id = quote.document_id
        doc_link = quote.link
        doc_name = quote.semantic_identifier
        if doc_link and doc_name and doc_id and doc_id not in doc_identifiers:
            doc_identifiers.append(doc_id)
            custom_semantic_identifier = _build_custom_semantic_identifier(
                semantic_identifier=doc_name,
                blurb=quote.blurb,
                source=quote.source_type,
            )
            quote_lines.append(f"- <{doc_link}|{custom_semantic_identifier}>")

    if not quote_lines:
        return [], []

    return (
        [
            SectionBlock(
                fields=[
                    "*Sources:*",
                    *quote_lines,
                ]
            )
        ],
        doc_identifiers,
    )


def build_qa_response_blocks(
    query_event_id: int,
    answer: str | None,
    quotes: list[DanswerQuote] | None,
    documents: list[SearchDoc],
) -> list[Block]:
    doc_identifiers: list[str] = []
    quotes_blocks: list[Block] = []
    if not answer:
        answer_block = SectionBlock(
            text="Sorry, I was unable to find an answer, but I did find some potentially relevant docs 🤓"
        )
    else:
        answer_block = SectionBlock(text=answer)
        if quotes:
            quotes_blocks, doc_identifiers = build_quotes_block(quotes)

        # if no quotes OR `build_quotes_block()` did not give back any blocks
        if not quotes_blocks:
            quotes_blocks = [
                SectionBlock(
                    text="*Warning*: no sources were quoted for this answer, so it may be unreliable 😔"
                )
            ]

    documents_block = build_documents_block(documents, doc_identifiers)
    return (
        [answer_block]
        + quotes_blocks
        + [documents_block, build_feedback_block(query_event_id=query_event_id)]
    )
