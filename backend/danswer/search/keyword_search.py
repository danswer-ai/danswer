from collections.abc import Callable

from nltk.corpus import stopwords  # type:ignore
from nltk.stem import WordNetLemmatizer  # type:ignore
from nltk.tokenize import word_tokenize  # type:ignore

from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import EDIT_KEYWORD_QUERY
from danswer.configs.app_configs import NUM_RETURNED_HITS
from danswer.datastores.interfaces import DocumentIndex
from danswer.datastores.interfaces import IndexFilters
from danswer.search.models import ChunkMetric
from danswer.search.models import MAX_METRICS_CONTENT
from danswer.search.models import RetrievalMetricsContainer
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time

logger = setup_logger()


def lemmatize_text(text: str) -> list[str]:
    lemmatizer = WordNetLemmatizer()
    word_tokens = word_tokenize(text)
    return [lemmatizer.lemmatize(word) for word in word_tokens]


def remove_stop_words(text: str) -> list[str]:
    stop_words = set(stopwords.words("english"))
    word_tokens = word_tokenize(text)
    text_trimmed = [word for word in word_tokens if word.casefold() not in stop_words]
    return text_trimmed or word_tokens


def query_processing(
    query: str,
) -> str:
    query = " ".join(remove_stop_words(query))
    query = " ".join(lemmatize_text(query))
    return query


@log_function_time()
def retrieve_keyword_documents(
    query: str,
    filters: IndexFilters,
    favor_recent: bool,
    datastore: DocumentIndex,
    num_hits: int = NUM_RETURNED_HITS,
    edit_query: bool = EDIT_KEYWORD_QUERY,
    retrieval_metrics_callback: Callable[[RetrievalMetricsContainer], None]
    | None = None,
) -> list[InferenceChunk] | None:
    edited_query = query_processing(query) if edit_query else query

    top_chunks = datastore.keyword_retrieval(
        edited_query, filters, favor_recent, num_hits
    )

    if not top_chunks:
        logger.warning(
            f"Keyword search returned no results - Filters: {filters}\tEdited Query: {edited_query}"
        )
        return None

    if retrieval_metrics_callback is not None:
        chunk_metrics = [
            ChunkMetric(
                document_id=chunk.document_id,
                chunk_content_start=chunk.content[:MAX_METRICS_CONTENT],
                first_link=chunk.source_links[0] if chunk.source_links else None,
                score=chunk.score if chunk.score is not None else 0,
            )
            for chunk in top_chunks
        ]
        retrieval_metrics_callback(
            RetrievalMetricsContainer(keyword_search=True, metrics=chunk_metrics)
        )

    return top_chunks
