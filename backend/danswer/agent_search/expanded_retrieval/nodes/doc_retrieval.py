import random
import time
from datetime import datetime
from unittest.mock import MagicMock

from danswer.agent_search.expanded_retrieval.states import DocRetrievalOutput
from danswer.agent_search.expanded_retrieval.states import ExpandedRetrievalState
from danswer.configs.constants import DocumentSource
from danswer.context.search.models import InferenceChunk
from danswer.context.search.models import InferenceSection


def create_mock_inference_section() -> MagicMock:
    # Create a mock InferenceChunk first
    mock_chunk = MagicMock(spec=InferenceChunk)
    mock_chunk.document_id = f"test_doc_id_{random.randint(1, 1000)}"
    mock_chunk.source_type = DocumentSource.FILE
    mock_chunk.semantic_identifier = "test_semantic_id"
    mock_chunk.title = "Test Title"
    mock_chunk.boost = 1
    mock_chunk.recency_bias = 1.0
    mock_chunk.score = 0.95
    mock_chunk.hidden = False
    mock_chunk.is_relevant = True
    mock_chunk.relevance_explanation = "Test relevance"
    mock_chunk.metadata = {"key": "value"}
    mock_chunk.match_highlights = ["<hi>test</hi> highlight"]
    mock_chunk.updated_at = datetime.now()
    mock_chunk.primary_owners = ["owner1"]
    mock_chunk.secondary_owners = ["owner2"]
    mock_chunk.large_chunk_reference_ids = [1, 2]
    mock_chunk.chunk_id = 1
    mock_chunk.content = "Test content"
    mock_chunk.blurb = "Test blurb"

    # Create the InferenceSection mock
    mock_section = MagicMock(spec=InferenceSection)
    mock_section.center_chunk = mock_chunk
    mock_section.chunks = [mock_chunk]
    mock_section.combined_content = "Test combined content"

    return mock_section


def get_mock_inference_sections() -> list[InferenceSection]:
    """Returns a list of mock InferenceSections for testing"""
    return [create_mock_inference_section()]


class RetrieveInput(ExpandedRetrievalState):
    query_to_retrieve: str


def doc_retrieval(state: RetrieveInput) -> DocRetrievalOutput:
    # def doc_retrieval(state: RetrieveInput) -> Command[Literal["doc_verification"]]:
    """
    Retrieve documents

    Args:
        state (dict): The current graph state

    Returns:
        state (dict): New key added to state, documents, that contains retrieved documents
    """
    print(f"doc_retrieval state: {state.keys()}")

    state["query_to_retrieve"]

    documents: list[InferenceSection] = []
    state["primary_llm"]
    state["fast_llm"]
    # db_session = state["db_session"]

    # from danswer.db.engine import get_session_context_manager
    # with get_session_context_manager() as db_session1:
    #     documents = SearchPipeline(
    #         search_request=SearchRequest(
    #             query=query_to_retrieve,
    #         ),
    #         user=None,
    #         llm=llm,
    #         fast_llm=fast_llm,
    #         db_session=db_session1,
    #     ).reranked_sections

    time.sleep(random.random() * 10)

    documents = get_mock_inference_sections()

    print(f"documents: {documents}")

    # return Command(
    #     update={"retrieved_documents": documents},
    #     goto=Send(
    #         node="doc_verification",
    #         arg=DocVerificationInput(
    #             doc_to_verify=documents,
    #             **state
    #         ),
    #     ),
    # )
    return DocRetrievalOutput(
        retrieved_documents=documents,
    )
