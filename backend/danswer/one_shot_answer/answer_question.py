import itertools
from collections.abc import Callable
from collections.abc import Iterator
from typing import cast

from sqlalchemy.orm import Session

from danswer.chat.chat_utils import get_chunks_for_qa
from danswer.chat.models import DanswerAnswerPiece
from danswer.chat.models import DanswerContext
from danswer.chat.models import DanswerContexts
from danswer.chat.models import DanswerQuotes
from danswer.chat.models import LLMMetricsContainer
from danswer.chat.models import LLMRelevanceFilterResponse
from danswer.chat.models import QADocsResponse
from danswer.chat.models import StreamingError
from danswer.configs.chat_configs import DEFAULT_NUM_CHUNKS_FED_TO_CHAT
from danswer.configs.chat_configs import QA_TIMEOUT
from danswer.configs.constants import MessageType
from danswer.configs.model_configs import CHUNK_SIZE
from danswer.db.chat import create_chat_session
from danswer.db.chat import create_new_chat_message
from danswer.db.chat import get_or_create_root_message
from danswer.db.chat import get_persona_by_id
from danswer.db.chat import get_prompt_by_id
from danswer.db.chat import translate_db_message_to_chat_message_detail
from danswer.db.embedding_model import get_current_db_embedding_model
from danswer.db.models import User
from danswer.document_index.factory import get_default_document_index
from danswer.indexing.models import InferenceChunk
from danswer.llm.utils import get_default_llm_token_encode
from danswer.one_shot_answer.factory import get_question_answer_model
from danswer.one_shot_answer.models import DirectQARequest
from danswer.one_shot_answer.models import OneShotQAResponse
from danswer.one_shot_answer.models import QueryRephrase
from danswer.one_shot_answer.qa_block import no_gen_ai_response
from danswer.one_shot_answer.qa_utils import combine_message_thread
from danswer.search.models import RerankMetricsContainer
from danswer.search.models import RetrievalMetricsContainer
from danswer.search.models import SavedSearchDoc
from danswer.search.request_preprocessing import retrieval_preprocessing
from danswer.search.search_runner import chunks_to_search_docs
from danswer.search.search_runner import full_chunk_search_generator
from danswer.secondary_llm_flows.answer_validation import get_answer_validity
from danswer.secondary_llm_flows.query_expansion import thread_based_query_rephrase
from danswer.server.query_and_chat.models import ChatMessageDetail
from danswer.server.utils import get_json_line
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_generator_function_time

logger = setup_logger()


def stream_answer_objects(
    query_req: DirectQARequest,
    user: User | None,
    db_session: Session,
    # Needed to translate persona num_chunks to tokens to the LLM
    default_num_chunks: float = DEFAULT_NUM_CHUNKS_FED_TO_CHAT,
    default_chunk_size: int = CHUNK_SIZE,
    timeout: int = QA_TIMEOUT,
    bypass_acl: bool = False,
    retrieval_metrics_callback: Callable[[RetrievalMetricsContainer], None]
    | None = None,
    rerank_metrics_callback: Callable[[RerankMetricsContainer], None] | None = None,
    llm_metrics_callback: Callable[[LLMMetricsContainer], None] | None = None,
) -> Iterator[
    QueryRephrase
    | QADocsResponse
    | LLMRelevanceFilterResponse
    | DanswerAnswerPiece
    | DanswerQuotes
    | DanswerContexts
    | StreamingError
    | ChatMessageDetail
]:
    """Streams in order:
    1. [always] Retrieved documents, stops flow if nothing is found
    2. [conditional] LLM selected chunk indices if LLM chunk filtering is turned on
    3. [always] A set of streamed DanswerAnswerPiece and DanswerQuotes at the end
                or an error anywhere along the line if something fails
    4. [always] Details on the final AI response message that is created
    """
    user_id = user.id if user is not None else None
    query_msg = query_req.messages[-1]
    history = query_req.messages[:-1]

    chat_session = create_chat_session(
        db_session=db_session,
        description="",  # One shot queries don't need naming as it's never displayed
        user_id=user_id,
        persona_id=query_req.persona_id,
        one_shot=True,
    )

    llm_tokenizer = get_default_llm_token_encode()

    embedding_model = get_current_db_embedding_model(db_session)

    document_index = get_default_document_index(
        primary_index_name=embedding_model.index_name, secondary_index_name=None
    )

    # Create a chat session which will just store the root message, the query, and the AI response
    root_message = get_or_create_root_message(
        chat_session_id=chat_session.id, db_session=db_session
    )

    history_str = combine_message_thread(history)

    rephrased_query = thread_based_query_rephrase(
        user_query=query_msg.message,
        history_str=history_str,
    )
    yield QueryRephrase(rephrased_query=rephrased_query)

    (
        retrieval_request,
        predicted_search_type,
        predicted_flow,
    ) = retrieval_preprocessing(
        query=rephrased_query,
        retrieval_details=query_req.retrieval_options,
        persona=chat_session.persona,
        user=user,
        db_session=db_session,
        bypass_acl=bypass_acl,
    )

    documents_generator = full_chunk_search_generator(
        search_query=retrieval_request,
        document_index=document_index,
        db_session=db_session,
        retrieval_metrics_callback=retrieval_metrics_callback,
        rerank_metrics_callback=rerank_metrics_callback,
    )
    applied_time_cutoff = retrieval_request.filters.time_cutoff
    recency_bias_multiplier = retrieval_request.recency_bias_multiplier
    run_llm_chunk_filter = not retrieval_request.skip_llm_chunk_filter

    # First fetch and return the top chunks so the user can immediately see some results
    top_chunks = cast(list[InferenceChunk], next(documents_generator))

    top_docs = chunks_to_search_docs(top_chunks)
    fake_saved_docs = [SavedSearchDoc.from_search_doc(doc) for doc in top_docs]

    # Since this is in the one shot answer flow, we don't need to actually save the docs to DB
    initial_response = QADocsResponse(
        top_documents=fake_saved_docs,
        predicted_flow=predicted_flow,
        predicted_search=predicted_search_type,
        applied_source_filters=retrieval_request.filters.source_type,
        applied_time_cutoff=applied_time_cutoff,
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

    prompt = None
    llm_override = None
    if query_req.prompt_id is not None:
        prompt = get_prompt_by_id(
            prompt_id=query_req.prompt_id, user_id=user_id, db_session=db_session
        )
        persona = get_persona_by_id(
            persona_id=query_req.persona_id, user_id=user_id, db_session=db_session
        )
        llm_override = persona.llm_model_version_override

    qa_model = get_question_answer_model(
        prompt=prompt,
        timeout=timeout,
        chain_of_thought=query_req.chain_of_thought,
        llm_version=llm_override,
    )

    full_prompt_str = (
        qa_model.build_prompt(
            query=query_msg.message, history_str=history_str, context_chunks=llm_chunks
        )
        if qa_model is not None
        else "Gen AI Disabled"
    )

    # Create the first User query message
    new_user_message = create_new_chat_message(
        chat_session_id=chat_session.id,
        parent_message=root_message,
        prompt_id=query_req.prompt_id,
        message=full_prompt_str,
        token_count=len(llm_tokenizer(full_prompt_str)),
        message_type=MessageType.USER,
        db_session=db_session,
        commit=True,
    )

    response_packets = (
        qa_model.answer_question_stream(
            prompt=full_prompt_str,
            llm_context_docs=llm_chunks,
            metrics_callback=llm_metrics_callback,
        )
        if qa_model is not None
        else no_gen_ai_response()
    )

    if qa_model is not None and query_req.return_contexts:
        contexts = DanswerContexts(
            contexts=[
                DanswerContext(
                    content=context_doc.content,
                    document_id=context_doc.document_id,
                    semantic_identifier=context_doc.semantic_identifier,
                    blurb=context_doc.semantic_identifier,
                )
                for context_doc in llm_chunks
            ]
        )

        response_packets = itertools.chain(response_packets, [contexts])

    # Capture outputs and errors
    llm_output = ""
    error: str | None = None
    for packet in response_packets:
        logger.debug(packet)

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


@log_generator_function_time()
def stream_search_answer(
    query_req: DirectQARequest,
    user: User | None,
    db_session: Session,
) -> Iterator[str]:
    objects = stream_answer_objects(
        query_req=query_req, user=user, db_session=db_session
    )
    for obj in objects:
        yield get_json_line(obj.dict())


def get_search_answer(
    query_req: DirectQARequest,
    user: User | None,
    db_session: Session,
    answer_generation_timeout: int = QA_TIMEOUT,
    enable_reflexion: bool = False,
    bypass_acl: bool = False,
    retrieval_metrics_callback: Callable[[RetrievalMetricsContainer], None]
    | None = None,
    rerank_metrics_callback: Callable[[RerankMetricsContainer], None] | None = None,
    llm_metrics_callback: Callable[[LLMMetricsContainer], None] | None = None,
) -> OneShotQAResponse:
    """Collects the streamed one shot answer responses into a single object"""
    qa_response = OneShotQAResponse()

    results = stream_answer_objects(
        query_req=query_req,
        user=user,
        db_session=db_session,
        bypass_acl=bypass_acl,
        timeout=answer_generation_timeout,
        retrieval_metrics_callback=retrieval_metrics_callback,
        rerank_metrics_callback=rerank_metrics_callback,
        llm_metrics_callback=llm_metrics_callback,
    )

    answer = ""
    for packet in results:
        if isinstance(packet, QueryRephrase):
            qa_response.rephrase = packet.rephrased_query
        if isinstance(packet, DanswerAnswerPiece) and packet.answer_piece:
            answer += packet.answer_piece
        elif isinstance(packet, QADocsResponse):
            qa_response.docs = packet
        elif isinstance(packet, LLMRelevanceFilterResponse):
            qa_response.llm_chunks_indices = packet.relevant_chunk_indices
        elif isinstance(packet, DanswerQuotes):
            qa_response.quotes = packet
        elif isinstance(packet, DanswerContexts):
            qa_response.contexts = packet
        elif isinstance(packet, StreamingError):
            qa_response.error_msg = packet.error
        elif isinstance(packet, ChatMessageDetail):
            qa_response.chat_message_id = packet.message_id

    if answer:
        qa_response.answer = answer

    if enable_reflexion:
        # Because follow up messages are explicitly tagged, we don't need to verify the answer
        if len(query_req.messages) == 1:
            first_query = query_req.messages[0].message
            qa_response.answer_valid = get_answer_validity(first_query, answer)
        else:
            qa_response.answer_valid = True

    return qa_response
