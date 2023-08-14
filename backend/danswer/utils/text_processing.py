import re

from bs4 import BeautifulSoup

from danswer.configs.constants import HTML_SEPARATOR


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
    """LLMs models sometime restructure whitespaces or edits special characters to fit a more likely
    distribution of characters found in its training data, but this hurts exact quote matching
    """
    text = text.lower()

    # \s: matches any whitespace character (spaces, tabs, newlines, etc.)
    # |: acts as an OR.
    # \*: matches the asterisk character.
    # \\": matches the \" sequence.
    # [.,:`"#-]: matches any character inside the square brackets.
    text = re.sub(r'\s|\*|\\"|[.,:`"#-]', "", text)

    return text


def parse_html_page_basic(text: str) -> str:
    soup = BeautifulSoup(text, "html.parser")
    return soup.get_text(HTML_SEPARATOR)
