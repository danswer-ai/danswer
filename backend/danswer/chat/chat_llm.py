from collections.abc import Iterator
from uuid import UUID

from langchain.schema.messages import AIMessage
from langchain.schema.messages import BaseMessage
from langchain.schema.messages import HumanMessage
from langchain.schema.messages import SystemMessage

from danswer.chat.chat_prompts import build_combined_query
from danswer.chat.chat_prompts import DANSWER_TOOL_NAME
from danswer.chat.chat_prompts import form_tool_followup_text
from danswer.chat.chat_prompts import form_user_prompt_text
from danswer.chat.chat_prompts import format_danswer_chunks_for_chat
from danswer.chat.tools import call_tool
from danswer.configs.app_configs import NUM_DOCUMENT_TOKENS_FED_TO_CHAT
from danswer.configs.constants import IGNORE_FOR_QA
from danswer.datastores.document_index import get_default_document_index
from danswer.db.models import ChatMessage
from danswer.db.models import Persona
from danswer.direct_qa.interfaces import DanswerAnswerPiece
from danswer.direct_qa.interfaces import DanswerChatModelOut
from danswer.direct_qa.qa_utils import get_usable_chunks
from danswer.llm.build import get_default_llm
from danswer.llm.llm import LLM
from danswer.llm.utils import translate_danswer_msg_to_langchain
from danswer.search.semantic_search import retrieve_ranked_documents
from danswer.utils.logger import setup_logger
from danswer.utils.text_processing import extract_embedded_json
from danswer.utils.text_processing import has_unescaped_quote

logger = setup_logger()


def _parse_embedded_json_streamed_response(
    tokens: Iterator[str],
) -> Iterator[DanswerAnswerPiece | DanswerChatModelOut]:
    final_answer = False
    just_start_stream = False
    model_output = ""
    hold = ""
    finding_end = 0
    for token in tokens:
        model_output += token
        hold += token

        if (
            final_answer is False
            and '"action":"finalanswer",' in model_output.lower().replace(" ", "")
        ):
            final_answer = True

        if final_answer and '"actioninput":"' in model_output.lower().replace(
            " ", ""
        ).replace("_", ""):
            if not just_start_stream:
                just_start_stream = True
                hold = ""

            if has_unescaped_quote(hold):
                finding_end += 1
                hold = hold[: hold.find('"')]

            if finding_end <= 1:
                if finding_end == 1:
                    finding_end += 1

                yield DanswerAnswerPiece(answer_piece=hold)
                hold = ""

    logger.debug(model_output)

    model_final = extract_embedded_json(model_output)
    if "action" not in model_final or "action_input" not in model_final:
        raise ValueError("Model did not provide all required action values")

    yield DanswerChatModelOut(
        model_raw=model_output,
        action=model_final["action"],
        action_input=model_final["action_input"],
    )
    return


def danswer_chat_retrieval(
    query_message: ChatMessage,
    history: list[ChatMessage],
    llm: LLM,
    user_id: UUID | None,
) -> str:
    if history:
        query_combination_msgs = build_combined_query(query_message, history)
        reworded_query = llm.invoke(query_combination_msgs)
    else:
        reworded_query = query_message.message

    # Good Debug/Breakpoint
    ranked_chunks, unranked_chunks = retrieve_ranked_documents(
        reworded_query,
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


def llm_contextless_chat_answer(messages: list[ChatMessage]) -> Iterator[str]:
    prompt = [translate_danswer_msg_to_langchain(msg) for msg in messages]

    return get_default_llm().stream(prompt)


def llm_contextual_chat_answer(
    messages: list[ChatMessage],
    persona: Persona,
    user_id: UUID | None,
) -> Iterator[str]:
    retrieval_enabled = persona.retrieval_enabled
    system_text = persona.system_text
    tool_text = persona.tools_text
    hint_text = persona.hint_text

    last_message = messages[-1]

    if not last_message.message:
        raise ValueError("User chat message is empty.")

    previous_messages = messages[:-1]

    user_text = form_user_prompt_text(
        query=last_message.message,
        tool_text=tool_text,
        hint_text=hint_text,
    )

    prompt: list[BaseMessage] = []

    if system_text:
        prompt.append(SystemMessage(content=system_text))

    prompt.extend(
        [translate_danswer_msg_to_langchain(msg) for msg in previous_messages]
    )

    prompt.append(HumanMessage(content=user_text))

    llm = get_default_llm()

    # Good Debug/Breakpoint
    tokens = llm.stream(prompt)

    final_result: DanswerChatModelOut | None = None
    final_answer_streamed = False
    for result in _parse_embedded_json_streamed_response(tokens):
        if isinstance(result, DanswerAnswerPiece) and result.answer_piece:
            yield result.answer_piece
            final_answer_streamed = True

        if isinstance(result, DanswerChatModelOut):
            final_result = result
            break

    if final_answer_streamed:
        return

    if final_result is None:
        raise RuntimeError("Model output finished without final output parsing.")

    if retrieval_enabled and final_result.action.lower() == DANSWER_TOOL_NAME.lower():
        tool_result_str = danswer_chat_retrieval(
            query_message=last_message,
            history=previous_messages,
            llm=llm,
            user_id=user_id,
        )
    else:
        tool_result_str = call_tool(final_result, user_id=user_id)

    prompt.append(AIMessage(content=final_result.model_raw))
    prompt.append(
        HumanMessage(
            content=form_tool_followup_text(
                tool_output=tool_result_str,
                query=last_message.message,
                hint_text=hint_text,
            )
        )
    )

    # Good Debug/Breakpoint
    tokens = llm.stream(prompt)

    for result in _parse_embedded_json_streamed_response(tokens):
        if isinstance(result, DanswerAnswerPiece) and result.answer_piece:
            yield result.answer_piece
            final_answer_streamed = True

    if final_answer_streamed is False:
        raise RuntimeError("LLM failed to produce a Final Answer")


def llm_chat_answer(
    messages: list[ChatMessage], persona: Persona | None, user_id: UUID | None
) -> Iterator[str]:
    # TODO how to handle model giving jibberish or fail on a particular message
    # TODO how to handle model failing to choose the right tool
    # TODO how to handle model gives wrong format
    if persona is None:
        return llm_contextless_chat_answer(messages)

    return llm_contextual_chat_answer(
        messages=messages, persona=persona, user_id=user_id
    )
