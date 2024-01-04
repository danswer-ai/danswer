from collections.abc import Callable
from collections.abc import Iterator
from functools import partial
from typing import cast

from sqlalchemy.orm import Session

from danswer.chat.chat_utils import build_chat_system_message
from danswer.chat.chat_utils import build_chat_user_message
from danswer.chat.chat_utils import create_chat_chain
from danswer.chat.chat_utils import drop_messages_history_overflow
from danswer.chat.chat_utils import extract_citations_from_stream
from danswer.chat.chat_utils import get_chunks_for_qa
from danswer.chat.chat_utils import llm_doc_from_inference_chunk
from danswer.chat.chat_utils import map_document_id_order
from danswer.chat.models import CitationInfo
from danswer.chat.models import DanswerAnswerPiece
from danswer.chat.models import LlmDoc
from danswer.chat.models import LLMRelevanceFilterResponse
from danswer.chat.models import QADocsResponse
from danswer.chat.models import StreamingError
from danswer.configs.chat_configs import CHUNK_SIZE
from danswer.configs.chat_configs import DEFAULT_NUM_CHUNKS_FED_TO_CHAT
from danswer.configs.constants import DISABLED_GEN_AI_MSG
from danswer.configs.constants import MessageType
from danswer.db.chat import create_db_search_doc
from danswer.db.chat import create_new_chat_message
from danswer.db.chat import get_chat_message
from danswer.db.chat import get_chat_session_by_id
from danswer.db.chat import get_db_search_doc_by_id
from danswer.db.chat import get_doc_query_identifiers_from_model
from danswer.db.chat import get_or_create_root_message
from danswer.db.chat import translate_db_message_to_chat_message_detail
from danswer.db.chat import translate_db_search_doc_to_server_search_doc
from danswer.db.models import ChatMessage
from danswer.db.models import SearchDoc as DbSearchDoc
from danswer.db.models import User
from danswer.document_index.factory import get_default_document_index
from danswer.indexing.models import InferenceChunk
from danswer.llm.exceptions import GenAIDisabledException
from danswer.llm.factory import get_default_llm
from danswer.llm.interfaces import LLM
from danswer.llm.utils import get_default_llm_token_encode
from danswer.llm.utils import translate_history_to_basemessages
from danswer.search.models import OptionalSearchSetting
from danswer.search.models import RetrievalDetails
from danswer.search.request_preprocessing import retrieval_preprocessing
from danswer.search.search_runner import chunks_to_search_docs
from danswer.search.search_runner import full_chunk_search_generator
from danswer.search.search_runner import inference_documents_from_ids
from danswer.secondary_llm_flows.choose_search import check_if_need_search
from danswer.secondary_llm_flows.query_expansion import history_based_query_rephrase
from danswer.server.query_and_chat.models import CreateChatMessageRequest
from danswer.server.utils import get_json_line
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_generator_function_time

logger = setup_logger()


def generate_ai_chat_response(
    query_message: ChatMessage,
    history: list[ChatMessage],
    context_docs: list[LlmDoc],
    doc_id_to_rank_map: dict[str, int],
    llm: LLM | None,
    llm_tokenizer: Callable,
    all_doc_useful: bool,
) -> Iterator[DanswerAnswerPiece | CitationInfo | StreamingError]:
    if llm is None:
        try:
            llm = get_default_llm()
        except GenAIDisabledException:
            # Not an error if it's a user configuration
            yield DanswerAnswerPiece(answer_piece=DISABLED_GEN_AI_MSG)
            return

    if query_message.prompt is None:
        raise RuntimeError("No prompt received for generating Gen AI answer.")

    try:
        context_exists = len(context_docs) > 0

        system_message_or_none, system_tokens = build_chat_system_message(
            prompt=query_message.prompt,
            context_exists=context_exists,
            llm_tokenizer=llm_tokenizer,
        )

        history_basemessages, history_token_counts = translate_history_to_basemessages(
            history
        )

        # Be sure the context_docs passed to build_chat_user_message
        # Is the same as passed in later for extracting citations
        user_message, user_tokens = build_chat_user_message(
            chat_message=query_message,
            prompt=query_message.prompt,
            context_docs=context_docs,
            llm_tokenizer=llm_tokenizer,
            all_doc_useful=all_doc_useful,
        )

        prompt = drop_messages_history_overflow(
            system_msg=system_message_or_none,
            system_token_count=system_tokens,
            history_msgs=history_basemessages,
            history_token_counts=history_token_counts,
            final_msg=user_message,
            final_msg_token_count=user_tokens,
        )

        # Good Debug/Breakpoint
        tokens = llm.stream(prompt)

        yield from extract_citations_from_stream(
            tokens, context_docs, doc_id_to_rank_map
        )

    except Exception as e:
        logger.exception(f"LLM failed to produce valid chat message, error: {e}")
        yield StreamingError(error=str(e))


def translate_citations(
    citations_list: list[CitationInfo], db_docs: list[DbSearchDoc]
) -> dict[int, int]:
    """Always cites the first instance of the document_id, assumes the db_docs
    are sorted in the order displayed in the UI"""
    doc_id_to_saved_doc_id_map: dict[str, int] = {}
    for db_doc in db_docs:
        if db_doc.document_id not in doc_id_to_saved_doc_id_map:
            doc_id_to_saved_doc_id_map[db_doc.document_id] = db_doc.id

    citation_to_saved_doc_id_map: dict[int, int] = {}
    for citation in citations_list:
        if citation.citation_num not in citation_to_saved_doc_id_map:
            citation_to_saved_doc_id_map[
                citation.citation_num
            ] = doc_id_to_saved_doc_id_map[citation.document_id]

    return citation_to_saved_doc_id_map


@log_generator_function_time()
def stream_chat_message(
    new_msg_req: CreateChatMessageRequest,
    user: User | None,
    db_session: Session,
    # Needed to translate persona num_chunks to tokens to the LLM
    default_num_chunks: float = DEFAULT_NUM_CHUNKS_FED_TO_CHAT,
    default_chunk_size: int = CHUNK_SIZE,
) -> Iterator[str]:
    """Streams in order:
    1. [conditional] Retrieved documents if a search needs to be run
    2. [conditional] LLM selected chunk indices if LLM chunk filtering is turned on
    3. [always] A set of streamed LLM tokens or an error anywhere along the line if something fails
    4. [always] Details on the final AI response message that is created

    """
    try:
        user_id = user.id if user is not None else None

        chat_session = get_chat_session_by_id(
            chat_session_id=new_msg_req.chat_session_id,
            user_id=user_id,
            db_session=db_session,
        )

        message_text = new_msg_req.message
        chat_session_id = new_msg_req.chat_session_id
        parent_id = new_msg_req.parent_message_id
        prompt_id = new_msg_req.prompt_id
        reference_doc_ids = new_msg_req.search_doc_ids
        retrieval_options = new_msg_req.retrieval_options
        persona = chat_session.persona
        query_override = new_msg_req.query_override

        if reference_doc_ids is None and retrieval_options is None:
            raise RuntimeError(
                "Must specify a set of documents for chat or specify search options"
            )

        try:
            llm = get_default_llm()
        except GenAIDisabledException:
            llm = None

        llm_tokenizer = get_default_llm_token_encode()
        document_index = get_default_document_index()

        # Every chat Session begins with an empty root message
        root_message = get_or_create_root_message(
            chat_session_id=chat_session_id, db_session=db_session
        )

        if parent_id is not None:
            parent_message = get_chat_message(
                chat_message_id=parent_id,
                user_id=user_id,
                db_session=db_session,
            )
        else:
            parent_message = root_message

        # Create new message at the right place in the tree and update the parent's child pointer
        # Don't commit yet until we verify the chat message chain
        new_user_message = create_new_chat_message(
            chat_session_id=chat_session_id,
            parent_message=parent_message,
            prompt_id=prompt_id,
            message=message_text,
            token_count=len(llm_tokenizer(message_text)),
            message_type=MessageType.USER,
            db_session=db_session,
            commit=False,
        )

        # Create linear history of messages
        final_msg, history_msgs = create_chat_chain(
            chat_session_id=chat_session_id, db_session=db_session
        )

        if final_msg.id != new_user_message.id:
            db_session.rollback()
            raise RuntimeError(
                "The new message was not on the mainline. "
                "Be sure to update the chat pointers before calling this."
            )

        # Save now to save the latest chat message
        db_session.commit()

        run_search = False
        # Retrieval options are only None if reference_doc_ids are provided
        if retrieval_options is not None and persona.num_chunks != 0:
            if retrieval_options.run_search == OptionalSearchSetting.ALWAYS:
                run_search = True
            elif retrieval_options.run_search == OptionalSearchSetting.NEVER:
                run_search = False
            else:
                run_search = check_if_need_search(
                    query_message=final_msg, history=history_msgs, llm=llm
                )

        rephrased_query = None
        if reference_doc_ids:
            identifier_tuples = get_doc_query_identifiers_from_model(
                search_doc_ids=reference_doc_ids,
                chat_session=chat_session,
                user_id=user_id,
                db_session=db_session,
            )

            # Generates full documents currently
            # May extend to include chunk ranges
            llm_docs: list[LlmDoc] = inference_documents_from_ids(
                doc_identifiers=identifier_tuples,
                document_index=get_default_document_index(),
            )
            doc_id_to_rank_map = map_document_id_order(
                cast(list[InferenceChunk | LlmDoc], llm_docs)
            )

            # In case the search doc is deleted, just don't include it
            # though this should never happen
            db_search_docs_or_none = [
                get_db_search_doc_by_id(doc_id=doc_id, db_session=db_session)
                for doc_id in reference_doc_ids
            ]

            reference_db_search_docs = [
                db_sd for db_sd in db_search_docs_or_none if db_sd
            ]

        elif run_search:
            rephrased_query = (
                history_based_query_rephrase(
                    query_message=final_msg, history=history_msgs, llm=llm
                )
                if query_override is None
                else query_override
            )

            (
                retrieval_request,
                predicted_search_type,
                predicted_flow,
            ) = retrieval_preprocessing(
                query=rephrased_query,
                retrieval_details=cast(RetrievalDetails, retrieval_options),
                persona=persona,
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

            # First fetch and return the top chunks to the UI so the user can
            # immediately see some results
            top_chunks = cast(list[InferenceChunk], next(documents_generator))

            # Get ranking of the documents for citation purposes later
            doc_id_to_rank_map = map_document_id_order(
                cast(list[InferenceChunk | LlmDoc], top_chunks)
            )

            top_docs = chunks_to_search_docs(top_chunks)

            reference_db_search_docs = [
                create_db_search_doc(server_search_doc=top_doc, db_session=db_session)
                for top_doc in top_docs
            ]

            response_docs = [
                translate_db_search_doc_to_server_search_doc(db_search_doc)
                for db_search_doc in reference_db_search_docs
            ]

            initial_response = QADocsResponse(
                rephrased_query=rephrased_query,
                top_documents=response_docs,
                predicted_flow=predicted_flow,
                predicted_search=predicted_search_type,
                applied_source_filters=retrieval_request.filters.source_type,
                applied_time_cutoff=time_cutoff,
                recency_bias_multiplier=recency_bias_multiplier,
            ).dict()
            yield get_json_line(initial_response)

            # Get the final ordering of chunks for the LLM call
            llm_chunk_selection = cast(list[bool], next(documents_generator))

            # Yield the list of LLM selected chunks for showing the LLM selected icons in the UI
            llm_relevance_filtering_response = LLMRelevanceFilterResponse(
                relevant_chunk_indices=[
                    index for index, value in enumerate(llm_chunk_selection) if value
                ]
                if run_llm_chunk_filter
                else []
            ).dict()
            yield get_json_line(llm_relevance_filtering_response)

            # Prep chunks to pass to LLM
            num_llm_chunks = (
                persona.num_chunks
                if persona.num_chunks is not None
                else default_num_chunks
            )
            llm_chunks_indices = get_chunks_for_qa(
                chunks=top_chunks,
                llm_chunk_selection=llm_chunk_selection,
                token_limit=num_llm_chunks * default_chunk_size,
            )
            llm_chunks = [top_chunks[i] for i in llm_chunks_indices]
            llm_docs = [llm_doc_from_inference_chunk(chunk) for chunk in llm_chunks]

        else:
            llm_docs = []
            doc_id_to_rank_map = {}
            reference_db_search_docs = None

        # Cannot determine these without the LLM step or breaking out early
        partial_response = partial(
            create_new_chat_message,
            chat_session_id=chat_session_id,
            parent_message=new_user_message,
            prompt_id=prompt_id,
            # message=,
            rephrased_query=rephrased_query,
            # token_count=,
            message_type=MessageType.ASSISTANT,
            # error=,
            reference_docs=reference_db_search_docs,
            db_session=db_session,
            commit=True,
        )

        # If no prompt is provided, this is interpreted as not wanting an AI Answer
        # Simply provide/save the retrieval results
        if final_msg.prompt is None:
            gen_ai_response_message = partial_response(
                message="",
                token_count=0,
                citations=None,
                error=None,
            )
            msg_detail_response = translate_db_message_to_chat_message_detail(
                gen_ai_response_message
            )

            yield get_json_line(msg_detail_response.dict())

            # Stop here after saving message details, the above still needs to be sent for the
            # message id to send the next follow-up message
            return

        # LLM prompt building, response capturing, etc.
        response_packets = generate_ai_chat_response(
            query_message=final_msg,
            history=history_msgs,
            context_docs=llm_docs,
            doc_id_to_rank_map=doc_id_to_rank_map,
            llm=llm,
            llm_tokenizer=llm_tokenizer,
            all_doc_useful=reference_doc_ids is not None,
        )

        # Capture outputs and errors
        llm_output = ""
        error: str | None = None
        citations: list[CitationInfo] = []
        for packet in response_packets:
            if isinstance(packet, DanswerAnswerPiece):
                token = packet.answer_piece
                if token:
                    llm_output += token
            elif isinstance(packet, StreamingError):
                error = packet.error
            elif isinstance(packet, CitationInfo):
                citations.append(packet)
                continue

            yield get_json_line(packet.dict())
    except Exception as e:
        logger.exception(e)

        # Frontend will erase whatever answer and show this instead
        # This will be the issue 99% of the time
        error_packet = StreamingError(
            error="LLM failed to respond, have you set your API key?"
        )

        yield get_json_line(error_packet.dict())
        return

    # Post-LLM answer processing
    try:
        db_citations = None
        if reference_db_search_docs:
            db_citations = translate_citations(
                citations_list=citations,
                db_docs=reference_db_search_docs,
            )

        # Saving Gen AI answer and responding with message info
        gen_ai_response_message = partial_response(
            message=llm_output,
            token_count=len(llm_tokenizer(llm_output)),
            citations=db_citations,
            error=error,
        )

        msg_detail_response = translate_db_message_to_chat_message_detail(
            gen_ai_response_message
        )

        yield get_json_line(msg_detail_response.dict())
    except Exception as e:
        logger.exception(e)

        # Frontend will erase whatever answer and show this instead
        error_packet = StreamingError(error="Failed to parse LLM output")

        yield get_json_line(error_packet.dict())
