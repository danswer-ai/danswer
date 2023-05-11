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

    # GPT models like to return cleaner spacing, not good for quote matching
    text = "".join(text.split())

    # GPT models sometimes like to clean up bulletpoints represented by *
    text = text.replace("*", "")

    # GPT models sometimes like to edit the quoting, ie "Title: Contents" becomes Title: "Contents"
    text = text.replace('\\"', "")
    text = text.replace('"', "")

    # GPT models often change up punctuations to make the text flow better.
    text = text.replace(".", "")
    text = text.replace(":", "")
    text = text.replace(",", "")
    text = text.replace("-", "")

    return text
