import bs4


def generate_confluence_document_id(base_url: str, content_url: str) -> str:
    return f"{base_url}{content_url}"


def get_used_attachments(text: str) -> list[str]:
    """Parse a Confluence html page to generate a list of current
        attachment in used

    Args:
        text (str): The page content

    Returns:
        list[str]: List of filename currently in used
    """
    files_in_used = []
    soup = bs4.BeautifulSoup(text, "html.parser")
    for attachment in soup.findAll("ri:attachment"):
        files_in_used.append(attachment.attrs["ri:filename"])
    return files_in_used
