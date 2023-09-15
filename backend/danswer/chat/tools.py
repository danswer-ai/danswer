from danswer.chat.chat_prompts import format_danswer_chunks_for_chat
from danswer.configs.app_configs import NUM_DOCUMENT_TOKENS_FED_TO_CHAT
from danswer.configs.constants import IGNORE_FOR_QA
from danswer.datastores.document_index import get_default_document_index
from danswer.direct_qa.interfaces import DanswerChatModelOut
from danswer.direct_qa.qa_utils import get_usable_chunks
from danswer.search.semantic_search import retrieve_ranked_documents
from uuid import UUID


def call_tool(
    model_actions: DanswerChatModelOut,
    user_id: UUID | None,
) -> str:
    if model_actions.action.lower() == "current search":
        query = model_actions.action_input

        ranked_chunks, unranked_chunks = retrieve_ranked_documents(
            query,
            user_id=user_id,
            filters=None,
            datastore=get_default_document_index(),
        )
        if not ranked_chunks:
            return "No results found"

        if unranked_chunks:
            ranked_chunks.extend(unranked_chunks)

        filtered_ranked_chunks = [
            chunk for chunk in ranked_chunks if not chunk.metadata.get(IGNORE_FOR_QA)
        ]

        # get all chunks that fit into the token limit
        usable_chunks = get_usable_chunks(
            chunks=filtered_ranked_chunks,
            token_limit=NUM_DOCUMENT_TOKENS_FED_TO_CHAT,
        )

        return format_danswer_chunks_for_chat(usable_chunks)

    raise ValueError("Invalid tool choice by LLM")
