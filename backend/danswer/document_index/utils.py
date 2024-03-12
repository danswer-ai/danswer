import re

from datetime import datetime
from datetime import timedelta
from datetime import timezone

_illegal_xml_chars_RE = re.compile(
    "[\x00-\x08\x0b\x0c\x0e-\x1F\uD800-\uDFFF\uFFFE\uFFFF]"
)


def remove_invalid_unicode_chars(text: str) -> str:
    """Vespa does not take in unicode chars that aren't valid for XML.
    This removes them."""
    return _illegal_xml_chars_RE.sub("", text)


def get_updated_at_attribute(t: datetime | None) -> int | None:
    if not t:
        return None

    if t.tzinfo != timezone.utc:
        raise ValueError("Connectors must provide document update time in UTC")

    return int(t.timestamp())
