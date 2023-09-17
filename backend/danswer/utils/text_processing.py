import json
import re

import bs4
from bs4 import BeautifulSoup


def has_unescaped_quote(s: str) -> bool:
    pattern = r'(?<!\\)"'
    return bool(re.search(pattern, s))


def escape_newlines(s: str) -> str:
    return re.sub(r"(?<!\\)\n", "\\\\n", s)


def replace_whitespaces_w_space(s: str) -> str:
    return re.sub(r"\s", " ", s)


def extract_embedded_json(s: str) -> dict:
    first_brace_index = s.find("{")
    last_brace_index = s.rfind("}")

    if first_brace_index == -1 or last_brace_index == -1:
        raise ValueError("No valid json found")

    return json.loads(s[first_brace_index : last_brace_index + 1])


def clean_up_code_blocks(model_out_raw: str) -> str:
    return model_out_raw.strip().strip("```").strip()


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


def strip_excessive_newlines_and_spaces(document: str) -> str:
    # collapse repeated spaces into one
    document = re.sub(r" +", " ", document)
    # remove trailing spaces
    document = re.sub(r" +[\n\r]", "\n", document)
    # remove repeated newlines
    document = re.sub(r"[\n\r]+", "\n", document)
    return document.strip()


def strip_newlines(document: str) -> str:
    # HTML might contain newlines which are just whitespaces to a browser
    return re.sub(r"[\n\r]+", " ", document)


def format_document_soup(document: BeautifulSoup) -> str:
    """Format html to a flat text document.

    The following goals:
    - Newlines from within the HTML are removed (as browser would ignore them as well).
    - Repeated newlines/spaces are removed (as browsers would ignore them).
    - Newlines only before and after headlines and paragraphs or when explicit (br or pre tag)
    - Table columns/rows are separated by newline
    - List elements are separated by newline and start with a hyphen
    """
    text = ""
    list_element_start = False
    verbatim_output = 0
    for e in document.descendants:
        verbatim_output -= 1
        if isinstance(e, bs4.element.NavigableString):
            if isinstance(e, (bs4.element.Comment, bs4.element.Doctype)):
                continue
            element_text = e.text
            if element_text:
                if verbatim_output > 0:
                    text += element_text
                else:
                    text += strip_newlines(element_text)
                list_element_start = False
        elif isinstance(e, bs4.element.Tag):
            if e.name in ["p", "div"]:
                if not list_element_start:
                    text += "\n"
            elif e.name in ["br", "h1", "h2", "h3", "h4", "tr", "th", "td"]:
                text += "\n"
                list_element_start = False
            elif e.name == "li":
                text += "\n- "
                list_element_start = True
            elif e.name == "pre":
                if verbatim_output <= 0:
                    verbatim_output = len(list(e.childGenerator()))
    return strip_excessive_newlines_and_spaces(text)


def parse_html_page_basic(text: str) -> str:
    soup = BeautifulSoup(text, "html.parser")
    return format_document_soup(soup)
