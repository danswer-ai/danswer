from slack_sdk.models.blocks import ActionsBlock
from slack_sdk.models.blocks import Block
from slack_sdk.models.blocks import ButtonElement
from slack_sdk.models.blocks import SectionBlock

from danswer.danswerbot.slack.constants import GENERATE_ANSWER_BUTTON_ACTION_ID


def build_standard_answer_blocks(
    answer_message: str,
) -> list[Block]:
    generate_button_block = ButtonElement(
        action_id=GENERATE_ANSWER_BUTTON_ACTION_ID,
        text="Generate Full Answer",
    )
    answer_block = SectionBlock(text=answer_message)
    return [
        answer_block,
        ActionsBlock(
            elements=[generate_button_block],
        ),
    ]
