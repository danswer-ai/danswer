from danswer.search.keyword_search import remove_stop_words
from danswer.search.semantic_search import get_default_tokenizer
from transformers import AutoTokenizer  # type:ignore


def count_unk_tokens(text: str, tokenizer: AutoTokenizer) -> int:
    tokenized_text = tokenizer.tokenize(text)
    return len([token for token in tokenized_text if token == tokenizer.unk_token])


def recommend_search(
    query: str,
    keyword: bool,
    max_percent_stopwords: float = 0.33,  # Every third word max, ie "effects of caffeine" still viable keyword search
) -> tuple[bool, str]:
    # Heuristics based decisions
    words = query.split()
    non_stopwords = remove_stop_words(query)
    non_stopword_percent = len(non_stopwords) / len(words)
    if non_stopword_percent < 1 - max_percent_stopwords:
        if keyword:
            return (
                True,
                "This query may be a better fit for AI search due to many words being thrown out as stopwords.",
            )
        else:
            return (
                False,
                "Many stopwords, Semantic Search better even if UNK tokens exist",
            )

    if count_unk_tokens(query, get_default_tokenizer()) > 2:
        if keyword:
            return False, "Many UNK tokens, keyword is correct"
        else:
            return True, "Many UNK tokens, switching to keyword likely performs better"

    # Model based decision
