import numpy as np
import tensorflow as tf  # type:ignore
from danswer.search.keyword_search import remove_stop_words
from danswer.search.models import QueryFlow
from danswer.search.models import SearchType
from danswer.search.search_utils import get_default_intent_model
from danswer.search.search_utils import get_default_intent_model_tokenizer
from danswer.search.search_utils import get_default_tokenizer
from danswer.server.models import HelperResponse
from transformers import AutoTokenizer  # type:ignore


def count_unk_tokens(text: str, tokenizer: AutoTokenizer) -> int:
    tokenized_text = tokenizer.tokenize(text)
    return len([token for token in tokenized_text if token == tokenizer.unk_token])


def query_intent(query: str) -> tuple[SearchType, QueryFlow]:
    tokenizer = get_default_intent_model_tokenizer()
    intent_model = get_default_intent_model()
    model_input = tokenizer(query, return_tensors="tf", truncation=True, padding=True)

    predictions = intent_model(model_input)[0]
    probabilities = tf.nn.softmax(predictions, axis=-1)
    class_percentages = np.round(probabilities.numpy() * 100, 2)

    keyword, semantic, qa = class_percentages.tolist()[0]

    # Heavily bias towards QA, from user perspective, answering a statement is not as bad as not answering a question
    if qa > 20:
        # If one class is very certain, choose it still
        if keyword > 70:
            return SearchType.KEYWORD, QueryFlow.SEARCH
        if semantic > 70:
            return SearchType.SEMANTIC, QueryFlow.SEARCH
        return SearchType.SEMANTIC, QueryFlow.QUESTION_ANSWER
    # If definitely not a QA question, choose between keyword or semantic search
    elif keyword > semantic:
        return SearchType.KEYWORD, QueryFlow.SEARCH
    else:
        return SearchType.SEMANTIC, QueryFlow.SEARCH


def recommend_search_flow(
    query: str,
    keyword: bool,
    max_percent_stopwords: float = 0.33,  # Every third word max, ie "effects of caffeine" still viable keyword search
) -> HelperResponse:
    heuristic_search_type: SearchType | None = None
    message: str | None = None

    # Heuristics based decisions
    words = query.split()
    non_stopwords = remove_stop_words(query)
    non_stopword_percent = len(non_stopwords) / len(words)

    # Too many UNK tokens -> suggest Keyword (still may be valid QA)
    if count_unk_tokens(query, get_default_tokenizer()) > 2:
        if not keyword:
            heuristic_search_type = SearchType.KEYWORD
            message = "Query contains words that the AI model cannot understand, Keyword Search may yield better results."

    # Too many stop words, most likely a Semantic query (still may be valid QA)
    if non_stopword_percent < 1 - max_percent_stopwords:
        if keyword:
            heuristic_search_type = SearchType.SEMANTIC
            message = "Query contains stopwords, AI Search is likely more suitable."

    # Model based decisions
    model_search_type, flow = query_intent(query)
    if not message:
        if model_search_type == SearchType.SEMANTIC and keyword:
            message = "Query may yield better results with Semantic Search"
        if model_search_type == SearchType.KEYWORD and not keyword:
            message = "Query may yield better results with Keyword Search."

    return HelperResponse(
        values={
            "flow": flow,
            "search_type": model_search_type
            if heuristic_search_type is None
            else heuristic_search_type,
        },
        details=[message] if message else [],
    )
