import re
import unicodedata
from typing import cast

from lxml import etree


def slugify(value, allow_unicode=False):
    """
    Taken from https://github.com/django/django/blob/master/django/utils/text.py
    Convert to ASCII if 'allow_unicode' is False. Convert spaces or repeated
    dashes to single dashes. Remove characters that aren't alphanumerics,
    underscores, or hyphens. Convert to lowercase. Also strip leading and
    trailing whitespace, dashes, and underscores.
    """
    value = str(value)
    if allow_unicode:
        value = unicodedata.normalize("NFKC", value)
    else:
        value = (
            unicodedata.normalize("NFKD", value)
            .encode("ascii", "ignore")
            .decode("ascii")
        )
    value = re.sub(r"[^\w\s-]", "", value.lower())
    return re.sub(r"[-\s]+", "-", value).strip("-_")


# This function processes the Wikipedia article, which is passed as an 'element'
def process_element(element):
    title = element.findtext("{http://www.mediawiki.org/xml/export-0.10/}title")
    text = cast(
        str,
        element.find("{http://www.mediawiki.org/xml/export-0.10/}revision").findtext(
            "{http://www.mediawiki.org/xml/export-0.10/}text"
        ),
    )
    if text.startswith("#REDIRECT"):
        print(f"Skipping redirect page: {title}")
        return 0

    with open(
        f"/Users/chrisweaver/Downloads/WikipediaProcessedSmall/{slugify(title)}.txt",
        "w+",
    ) as f:
        print(f"Writing '{title}'")
        f.write(f"{title}\n\n{text}")
    return 1
    # print(f"Title: {title}")
    # print(f"Text: {text}")  # Print the first 500 characters of the text


# Path to the Wikipedia XML dump
file_path = (
    "/Users/chrisweaver/Downloads/enwiki-20230820-pages-articles-multistream.xml"
)

# Create an iterable XML parser
context = etree.iterparse(
    file_path, tag="{http://www.mediawiki.org/xml/export-0.10/}page", huge_tree=True
)

# Counter for number of pages processed
page_counter = 0
# Number of pages you want to extract
n_pages = 50_000

pages_written = 0
for _, element in context:
    pages_written += process_element(element)
    element.clear()  # Clear the element to free up memory
    page_counter += 1
    if pages_written >= n_pages:
        break

# Clean up the XML parser and delete the associated memory
del context
