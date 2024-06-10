import re

# NOTE: This does not seem to be used in reality despite the Vespa Docs pointing to this code
# See here for reference: https://docs.vespa.ai/en/documents.html
# https://github.com/vespa-engine/vespa/blob/master/vespajlib/src/main/java/com/yahoo/text/Text.java

# Define allowed ASCII characters
ALLOWED_ASCII_CHARS = [False] * 0x80
ALLOWED_ASCII_CHARS[0x9] = True  # tab
ALLOWED_ASCII_CHARS[0xA] = True  # newline
ALLOWED_ASCII_CHARS[0xD] = True  # carriage return
for i in range(0x20, 0x7F):
    ALLOWED_ASCII_CHARS[i] = True  # printable ASCII chars
ALLOWED_ASCII_CHARS[0x7F] = True  # del - discouraged, but allowed


def is_text_character(codepoint):
    """Returns whether the given codepoint is a valid text character."""
    if codepoint < 0x80:
        return ALLOWED_ASCII_CHARS[codepoint]
    if codepoint < 0xD800:
        return True
    if codepoint <= 0xDFFF:
        return False
    if codepoint < 0xFDD0:
        return True
    if codepoint <= 0xFDEF:
        return False
    if codepoint >= 0x10FFFE:
        return False
    return (codepoint & 0xFFFF) < 0xFFFE


def replace_invalid_doc_id_characters(text):
    # There may be a more complete set of replacements that need to be made but Vespa docs are unclear
    # and users only seem to be running into this error with single quotes
    return text.replace("'", "_")


_illegal_xml_chars_RE = re.compile(
    "[\x00-\x08\x0b\x0c\x0e-\x1F\uD800-\uDFFF\uFFFE\uFFFF]"
)


def remove_invalid_unicode_chars(text: str) -> str:
    """Vespa does not take in unicode chars that aren't valid for XML.
    This removes them."""
    return _illegal_xml_chars_RE.sub("", text)
