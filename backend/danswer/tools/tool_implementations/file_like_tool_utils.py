from langchain_core.messages import HumanMessage

from danswer.db.engine import get_session_with_tenant
from danswer.file_store.file_store import get_default_file_store
from danswer.file_store.models import ChatFileType
from danswer.file_store.models import InMemoryChatFile
from danswer.llm.answering.prompts.build import AnswerPromptBuilder
from danswer.llm.utils import build_content_with_imgs
from danswer.utils.logger import setup_logger

FINAL_CONTEXT_DOCUMENTS_ID = "final_context_documents"

logger = setup_logger()

IMG_GENERATION_SUMMARY_PROMPT = """
You have just created the attached images in response to the following query: "{query}".

Can you please summarize them in a sentence or two? Do NOT include image urls or bulleted lists.
"""


def build_file_generation_user_prompt(
    query: str, files: list[InMemoryChatFile] | None = None
) -> HumanMessage:
    return HumanMessage(
        content=build_content_with_imgs(
            message=IMG_GENERATION_SUMMARY_PROMPT.format(query=query).strip(),
            files=files,
        )
    )


def build_next_prompt_for_file_like_tool(
    prompt_builder: AnswerPromptBuilder,
    file_ids: list[str],
    file_type: ChatFileType,
) -> AnswerPromptBuilder:
    with get_session_with_tenant() as db_session:
        file_store = get_default_file_store(db_session)

        files = []
        for file_id in file_ids:
            try:
                file_io = file_store.read_file(file_id, mode="b")
                files.append(
                    InMemoryChatFile(
                        file_id=file_id,
                        filename=file_id,
                        content=file_io.read(),
                        file_type=file_type,
                    )
                )
            except Exception:
                logger.exception(f"Failed to read file {file_id}")

        # Update prompt with file content
        prompt_builder.update_user_prompt(
            build_file_generation_user_prompt(
                query=prompt_builder.get_user_message_content(),
                files=files,
            )
        )

    return prompt_builder
