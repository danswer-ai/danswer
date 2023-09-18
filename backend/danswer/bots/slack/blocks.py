from slack_sdk.models.blocks import ActionsBlock
from slack_sdk.models.blocks import Block
from slack_sdk.models.blocks import ButtonElement
from slack_sdk.models.blocks import ConfirmObject
from slack_sdk.models.blocks import DividerBlock
from slack_sdk.models.blocks import HeaderBlock
from slack_sdk.models.blocks import SectionBlock

from danswer.bots.slack.constants import DISLIKE_BLOCK_ACTION_ID
from danswer.bots.slack.constants import LIKE_BLOCK_ACTION_ID
from danswer.bots.slack.utils import build_feedback_block_id
from danswer.bots.slack.utils import translate_vespa_highlight_to_slack
from danswer.configs.app_configs import DANSWER_BOT_NUM_DOCS_TO_DISPLAY
from danswer.configs.app_configs import ENABLE_SLACK_DOC_FEEDBACK
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import SearchFeedbackType
from danswer.connectors.slack.utils import UserIdReplacer
from danswer.direct_qa.interfaces import DanswerQuote
from danswer.server.models import SearchDoc
from danswer.utils.text_processing import replace_whitespaces_w_space


_MAX_BLURB_LEN = 75


def build_qa_feedback_block(query_event_id: int) -> Block:
    return ActionsBlock(
        block_id=build_feedback_block_id(query_event_id),
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


def build_doc_feedback_block(
    query_event_id: int,
    document_id: str,
    document_rank: int,
) -> Block:
    return ActionsBlock(
        block_id=build_feedback_block_id(query_event_id, document_id, document_rank),
        elements=[
            ButtonElement(
                action_id=SearchFeedbackType.ENDORSE.value,
                text="⬆",
                style="primary",
                confirm=ConfirmObject(
                    title="Endorse this Document",
                    text="This is a good source of information and should be shown more often!",
                ),
            ),
            ButtonElement(
                action_id=SearchFeedbackType.REJECT.value,
                text="⬇",
                style="danger",
                confirm=ConfirmObject(
                    title="Reject this Document",
                    text="This is a bad source of information and should be shown less often.",
                ),
            ),
        ],
    )


def _build_custom_semantic_identifier(
    semantic_identifier: str, match_str: str, source: str
) -> str:
    """
    On slack, since we just show the semantic identifier rather than semantic + blurb, we need
    to do some custom formatting to make sure the semantic identifier is unique and meaningful.
    """
    if source == DocumentSource.SLACK.value:
        truncated_blurb = (
            f"{match_str[:_MAX_BLURB_LEN]}..."
            if len(match_str) > _MAX_BLURB_LEN
            else match_str
        )
        # NOTE: removing tags so that we don't accidentally tag users in Slack +
        # so that it can be used as part of a <link|text> link
        truncated_blurb = UserIdReplacer.replace_tags_basic(truncated_blurb)
        truncated_blurb = UserIdReplacer.replace_channels_basic(truncated_blurb)
        truncated_blurb = UserIdReplacer.replace_special_mentions(truncated_blurb)
        truncated_blurb = UserIdReplacer.replace_links(truncated_blurb)
        # stop as soon as we see a newline, since these break the link
        truncated_blurb = truncated_blurb.split("\n")[0]
        if truncated_blurb:
            return f"#{semantic_identifier}: {truncated_blurb}"
        else:
            return f"#{semantic_identifier}"

    return semantic_identifier


def build_documents_blocks(
    documents: list[SearchDoc],
    query_event_id: int,
    num_docs_to_display: int = DANSWER_BOT_NUM_DOCS_TO_DISPLAY,
    include_feedback: bool = ENABLE_SLACK_DOC_FEEDBACK,
) -> list[Block]:
    seen_docs_identifiers = set()
    section_blocks: list[Block] = [HeaderBlock(text="Reference Documents")]
    included_docs = 0
    for rank, d in enumerate(documents):
        if d.document_id in seen_docs_identifiers:
            continue
        seen_docs_identifiers.add(d.document_id)

        match_str = translate_vespa_highlight_to_slack(d.match_highlights)

        included_docs += 1

        section_blocks.append(
            SectionBlock(
                fields=[
                    f"<{d.link}|{d.semantic_identifier}>:\n>{match_str}",
                ]
            ),
        )

        if include_feedback:
            section_blocks.append(
                build_doc_feedback_block(
                    query_event_id=query_event_id,
                    document_id=d.document_id,
                    document_rank=rank,
                ),
            )

        section_blocks.append(DividerBlock())

        if included_docs >= num_docs_to_display:
            break

    return section_blocks


def build_blurb_quotes_block(
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
                match_str=quote.blurb,
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


def build_quotes_block(
    quotes: list[DanswerQuote],
) -> list[Block]:
    quote_lines: list[str] = []
    doc_to_quotes: dict[str, list[str]] = {}
    doc_to_link: dict[str, str] = {}
    doc_to_sem_id: dict[str, str] = {}
    for q in quotes:
        quote = q.quote
        doc_id = q.document_id
        doc_link = q.link
        doc_name = q.semantic_identifier
        if doc_link and doc_name and doc_id and quote:
            if doc_id not in doc_to_quotes:
                doc_to_quotes[doc_id] = [quote]
                doc_to_link[doc_id] = doc_link
                doc_to_sem_id[doc_id] = doc_name
            else:
                doc_to_quotes[doc_id].append(quote)

    for doc_id, quote_strs in doc_to_quotes.items():
        quotes_str_clean = [
            replace_whitespaces_w_space(q_str).strip() for q_str in quote_strs
        ]
        longest_quotes = sorted(quotes_str_clean, key=len, reverse=True)[:5]
        single_quote_str = "\n".join([f"```{q_str}```" for q_str in longest_quotes])
        link = doc_to_link[doc_id]
        sem_id = doc_to_sem_id[doc_id]
        quote_lines.append(f"<{link}|{sem_id}>\n{single_quote_str}")

    if not doc_to_quotes:
        return []

    return [
        SectionBlock(
            fields=[
                "*Relevant Snippets:*",
                *quote_lines,
            ]
        )
    ]


def build_qa_response_blocks(
    query_event_id: int,
    answer: str | None,
    quotes: list[DanswerQuote] | None,
) -> list[Block]:
    quotes_blocks: list[Block] = []

    ai_answer_header = HeaderBlock(text="AI Answer")

    if not answer:
        answer_block = SectionBlock(
            text="Sorry, I was unable to find an answer, but I did find some potentially relevant docs 🤓"
        )
    else:
        answer_block = SectionBlock(text=answer)
        if quotes:
            quotes_blocks = build_quotes_block(quotes)

        # if no quotes OR `build_quotes_block()` did not give back any blocks
        if not quotes_blocks:
            quotes_blocks = [
                SectionBlock(
                    text="*Warning*: no sources were quoted for this answer, so it may be unreliable 😔"
                )
            ]

    feedback_block = build_qa_feedback_block(query_event_id=query_event_id)
    return (
        [
            ai_answer_header,
            answer_block,
            feedback_block,
        ]
        + quotes_blocks
        + [DividerBlock()]
    )
