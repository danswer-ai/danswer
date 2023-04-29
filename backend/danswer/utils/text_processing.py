def clean_model_quote(quote: str, trim_length: int) -> str:
    quote_clean = quote.strip()
    if quote_clean[0] == '"':
        quote_clean = quote_clean[1:]
    if quote_clean[-1] == '"':
        quote_clean = quote_clean[:-1]
    if trim_length > 0:
        quote_clean = quote_clean[:trim_length]
    return quote_clean


def shared_precompare_cleanup(text: str) -> str:
    text = text.lower()
    text = "".join(
        text.split()
    )  # GPT models like to return cleaner spacing, not good for quote matching
    return text.replace(
        "*", ""
    )  # GPT models sometimes like to cleanup bulletpoints represented by *
