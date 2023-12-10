import re
from collections.abc import Callable
from collections.abc import Iterator
from typing import cast

from langchain.schema.messages import BaseMessage
from sqlalchemy.orm import Session

from danswer.chat.chat_helpers import build_chat_system_message
from danswer.chat.chat_helpers import build_chat_user_message
from danswer.chat.chat_helpers import llm_doc_from_inference_chunk
from danswer.configs.app_configs import CHUNK_SIZE
from danswer.configs.app_configs import DEFAULT_NUM_CHUNKS_FED_TO_CHAT
from danswer.configs.constants import MessageType
from danswer.configs.model_configs import GEN_AI_MAX_INPUT_TOKENS
from danswer.db.chat import create_db_search_doc, create_chat_session
from danswer.db.chat import create_new_chat_message
from danswer.db.chat import get_chat_message
from danswer.db.chat import get_chat_messages_by_session
from danswer.db.chat import get_chat_session_by_id
from danswer.db.chat import get_db_search_doc_by_id
from danswer.db.chat import get_doc_query_identifiers_from_model
from danswer.db.chat import get_or_create_root_message
from danswer.db.chat import translate_db_message_to_chat_message_detail
from danswer.db.models import ChatMessage
from danswer.db.models import User
from danswer.direct_qa.factory import get_default_qa_model
from danswer.direct_qa.interfaces import DanswerAnswerPiece, DanswerQuotes
from danswer.direct_qa.interfaces import StreamingError
from danswer.direct_qa.qa_utils import get_chunks_for_qa
from danswer.document_index.factory import get_default_document_index
from danswer.indexing.models import InferenceChunk
from danswer.llm.factory import get_default_llm
from danswer.llm.interfaces import LLM
from danswer.llm.utils import get_default_llm_token_encode
from danswer.llm.utils import translate_danswer_msg_to_langchain
from danswer.one_shot_answer.models import DirectQARequest, OneShotQAResponse
from danswer.search.models import OptionalSearchSetting
from danswer.search.request_preprocessing import retrieval_preprocessing
from danswer.search.search_runner import chunks_to_search_docs
from danswer.search.search_runner import full_chunk_search_generator
from danswer.search.search_runner import inference_documents_from_ids
from danswer.secondary_llm_flows.chat_helpers import check_if_need_search
from danswer.secondary_llm_flows.chat_helpers import history_based_query_rephrase
from danswer.server.chat.models import CreateChatMessageRequest, ChatMessageDetail
from danswer.server.chat.models import LlmDoc
from danswer.server.chat.models import LLMRelevanceFilterResponse
from danswer.server.chat.models import QADocsResponse
from danswer.server.chat.models import RetrievalDetails
from danswer.server.chat.models import SearchDoc
from danswer.server.utils import get_json_line
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_generator_function_time

logger = setup_logger()


@log_generator_function_time()
def stream_answer_objects(
    query_req: DirectQARequest,
    user: User | None,
    db_session: Session,
    # Needed to translate persona num_chunks to tokens to the LLM
    default_num_chunks: float = DEFAULT_NUM_CHUNKS_FED_TO_CHAT,
    default_chunk_size: int = CHUNK_SIZE,
) -> Iterator[QADocsResponse | LLMRelevanceFilterResponse | DanswerAnswerPiece | DanswerQuotes | StreamingError | ChatMessageDetail]:
    """Streams in order:
    1. [always] Retrieved documents, stops flow if nothing is found
    2. [conditional] LLM selected chunk indices if LLM chunk filtering is turned on
    3. [always] A set of streamed DanswerAnswerPiece and DanswerQuotes at the end
                or an error anywhere along the line if something fails
    4. [always] Details on the final AI response message that is created
    """
    user_id = user.id if user is not None else None

    chat_session = create_chat_session(
        db_session=db_session,
        description="",  # One shot queries don't need naming as it's never displayed
        user_id=user_id,
        persona_id=query_req.persona_id,
        one_shot=True
    )

    llm_tokenizer = get_default_llm_token_encode()
    document_index = get_default_document_index()

    # Create a chat session which will just store the root message, the query, and the AI response
    root_message = get_or_create_root_message(
        chat_session_id=chat_session.id, db_session=db_session
    )

    # Create the first User query message
    new_user_message = create_new_chat_message(
        chat_session_id=chat_session.id,
        parent_message=root_message,
        prompt_id=query_req.prompt_id,
        message=query_req.query,
        token_count=len(llm_tokenizer(query_req.query)),
        message_type=MessageType.USER,
        db_session=db_session,
        commit=True,
    )

    (
        retrieval_request,
        predicted_search_type,
        predicted_flow,
    ) = retrieval_preprocessing(
        query=query_req.query,
        retrieval_details=query_req.retrieval_options,
        persona=chat_session.persona,
        user=user,
        db_session=db_session,
    )

    documents_generator = full_chunk_search_generator(
        search_query=retrieval_request,
        document_index=document_index,
    )
    time_cutoff = retrieval_request.filters.time_cutoff
    recency_bias_multiplier = retrieval_request.recency_bias_multiplier
    run_llm_chunk_filter = not retrieval_request.skip_llm_chunk_filter

    # First fetch and return the top chunks so the user can immediately see some results
    top_chunks = cast(list[InferenceChunk], next(documents_generator))

    top_docs = chunks_to_search_docs(top_chunks)
    initial_response = QADocsResponse(
        top_documents=top_docs,
        predicted_flow=predicted_flow,
        predicted_search=predicted_search_type,
        time_cutoff=time_cutoff,
        recency_bias_multiplier=recency_bias_multiplier,
    )
    yield initial_response

    # Get the final ordering of chunks for the LLM call
    llm_chunk_selection = cast(list[bool], next(documents_generator))

    # Yield the list of LLM selected chunks for showing the LLM selected icons in the UI
    llm_relevance_filtering_response = LLMRelevanceFilterResponse(
        relevant_chunk_indices=[
            index for index, value in enumerate(llm_chunk_selection) if value
        ]
        if run_llm_chunk_filter
        else []
    )
    yield llm_relevance_filtering_response

    # Prep chunks to pass to LLM
    num_llm_chunks = (
        chat_session.persona.num_chunks
        if chat_session.persona.num_chunks is not None
        else default_num_chunks
    )
    llm_chunks_indices = get_chunks_for_qa(
        chunks=top_chunks,
        llm_chunk_selection=llm_chunk_selection,
        token_limit=num_llm_chunks * default_chunk_size,
    )
    llm_chunks = [top_chunks[i] for i in llm_chunks_indices]

    logger.debug(
        f"Chunks fed to LLM: {[chunk.semantic_identifier for chunk in llm_chunks]}"
    )

    qa_model = get_default_qa_model()

    response_packets = qa_model.answer_question_stream(
        query_req.query, llm_chunks
    )

    # Capture outputs and errors
    llm_output = ""
    error: str | None = None
    for packet in response_packets:
        if isinstance(packet, DanswerAnswerPiece):
            token = packet.answer_piece
            if token:
                llm_output += token
        elif isinstance(packet, StreamingError):
            error = packet.error

        yield packet

    # Saving Gen AI answer and responding with message info
    gen_ai_response_message = create_new_chat_message(
        chat_session_id=chat_session.id,
        parent_message=new_user_message,
        prompt_id=query_req.prompt_id,
        message=llm_output,
        token_count=len(llm_tokenizer(llm_output)),
        message_type=MessageType.ASSISTANT,
        error=error,
        reference_docs=None,  # Don't need to save reference docs for one shot flow
        db_session=db_session,
        commit=True,
    )

    msg_detail_response = translate_db_message_to_chat_message_detail(
        gen_ai_response_message
    )

    yield msg_detail_response


def get_one_shot_answer(
    query_req: DirectQARequest,
    user: User | None,
    db_session: Session,
) -> Iterator[str]:
    objects = stream_answer_objects(
        query_req=query_req,
        user=user,
        db_session=db_session
    )
    for obj in objects:
        yield get_json_line(obj.dict())


def get_one_shot_answer(
    query_req: DirectQARequest,
    user: User | None,
    db_session: Session,
) -> OneShotQAResponse:
    """Collects the streamed one shot answer responses into a single object"""
    results = stream_answer_objects(
        query_req=query_req,
        user=user,
        db_session=db_session
    )