from collections.abc import Sequence

from danswer.connectors.models import Document

ALL_FILES = list(range(0, 60))
SHARED_DRIVE_FILES = list(range(20, 25))


_ADMIN_FILE_IDS = list(range(0, 5))
_TEST_USER_1_FILE_IDS = list(range(5, 10))
_TEST_USER_2_FILE_IDS = list(range(10, 15))
_TEST_USER_3_FILE_IDS = list(range(15, 20))
_SHARED_DRIVE_1_FILE_IDS = list(range(20, 25))
_FOLDER_1_FILE_IDS = list(range(25, 30))
_FOLDER_1_1_FILE_IDS = list(range(30, 35))
_FOLDER_1_2_FILE_IDS = list(range(35, 40))
_SHARED_DRIVE_2_FILE_IDS = list(range(40, 45))
_FOLDER_2_FILE_IDS = list(range(45, 50))
_FOLDER_2_1_FILE_IDS = list(range(50, 55))
_FOLDER_2_2_FILE_IDS = list(range(55, 60))
_SECTIONS_FILE_IDS = [61]

_PUBLIC_FOLDER_RANGE = _FOLDER_1_2_FILE_IDS
_PUBLIC_FILE_IDS = list(range(55, 57))
PUBLIC_RANGE = _PUBLIC_FOLDER_RANGE + _PUBLIC_FILE_IDS

_SHARED_DRIVE_1_URL = "https://drive.google.com/drive/folders/0AC_OJ4BkMd4kUk9PVA"
# Group 1 is given access to this folder
_FOLDER_1_URL = (
    "https://drive.google.com/drive/folders/1d3I7U3vUZMDziF1OQqYRkB8Jp2s_GWUn"
)
_FOLDER_1_1_URL = (
    "https://drive.google.com/drive/folders/1aR33-zwzl_mnRAwH55GgtWTE-4A4yWWI"
)
_FOLDER_1_2_URL = (
    "https://drive.google.com/drive/folders/1IO0X55VhvLXf4mdxzHxuKf4wxrDBB6jq"
)
_SHARED_DRIVE_2_URL = "https://drive.google.com/drive/folders/0ABKspIh7P4f4Uk9PVA"
_FOLDER_2_URL = (
    "https://drive.google.com/drive/folders/1lNpCJ1teu8Se0louwL0oOHK9nEalskof"
)
_FOLDER_2_1_URL = (
    "https://drive.google.com/drive/folders/1XeDOMWwxTDiVr9Ig2gKum3Zq_Wivv6zY"
)
_FOLDER_2_2_URL = (
    "https://drive.google.com/drive/folders/1RKlsexA8h7NHvBAWRbU27MJotic7KXe3"
)

_ADMIN_EMAIL = "admin@onyx-test.com"
_TEST_USER_1_EMAIL = "test_user_1@onyx-test.com"
_TEST_USER_2_EMAIL = "test_user_2@onyx-test.com"
_TEST_USER_3_EMAIL = "test_user_3@onyx-test.com"

# Dictionary for ranges
DRIVE_ID_MAPPING: dict[str, list[int]] = {
    "ADMIN": _ADMIN_FILE_IDS,
    "TEST_USER_1": _TEST_USER_1_FILE_IDS,
    "TEST_USER_2": _TEST_USER_2_FILE_IDS,
    "TEST_USER_3": _TEST_USER_3_FILE_IDS,
    "SHARED_DRIVE_1": _SHARED_DRIVE_1_FILE_IDS,
    "FOLDER_1": _FOLDER_1_FILE_IDS,
    "FOLDER_1_1": _FOLDER_1_1_FILE_IDS,
    "FOLDER_1_2": _FOLDER_1_2_FILE_IDS,
    "SHARED_DRIVE_2": _SHARED_DRIVE_2_FILE_IDS,
    "FOLDER_2": _FOLDER_2_FILE_IDS,
    "FOLDER_2_1": _FOLDER_2_1_FILE_IDS,
    "FOLDER_2_2": _FOLDER_2_2_FILE_IDS,
    "SECTIONS": _SECTIONS_FILE_IDS,
}

# Dictionary for emails
EMAIL_MAPPING: dict[str, str] = {
    "ADMIN": _ADMIN_EMAIL,
    "TEST_USER_1": _TEST_USER_1_EMAIL,
    "TEST_USER_2": _TEST_USER_2_EMAIL,
    "TEST_USER_3": _TEST_USER_3_EMAIL,
}

# Dictionary for URLs
URL_MAPPING: dict[str, str] = {
    "SHARED_DRIVE_1": _SHARED_DRIVE_1_URL,
    "FOLDER_1": _FOLDER_1_URL,
    "FOLDER_1_1": _FOLDER_1_1_URL,
    "FOLDER_1_2": _FOLDER_1_2_URL,
    "SHARED_DRIVE_2": _SHARED_DRIVE_2_URL,
    "FOLDER_2": _FOLDER_2_URL,
    "FOLDER_2_1": _FOLDER_2_1_URL,
    "FOLDER_2_2": _FOLDER_2_2_URL,
}

# Dictionary for access permissions
# All users have access to their own My Drive as well as public files
ACCESS_MAPPING: dict[str, list[int]] = {
    # Admin has access to everything in shared
    "ADMIN": (
        _ADMIN_FILE_IDS
        + _SHARED_DRIVE_1_FILE_IDS
        + _FOLDER_1_FILE_IDS
        + _FOLDER_1_1_FILE_IDS
        + _FOLDER_1_2_FILE_IDS
        + _SHARED_DRIVE_2_FILE_IDS
        + _FOLDER_2_FILE_IDS
        + _FOLDER_2_1_FILE_IDS
        + _FOLDER_2_2_FILE_IDS
        + _SECTIONS_FILE_IDS
    ),
    # This user has access to drive 1
    # This user has redundant access to folder 1 because of group access
    # This user has been given individual access to files in Admin's My Drive
    "TEST_USER_1": (
        _TEST_USER_1_FILE_IDS
        + _SHARED_DRIVE_1_FILE_IDS
        + _FOLDER_1_FILE_IDS
        + _FOLDER_1_1_FILE_IDS
        + _FOLDER_1_2_FILE_IDS
        + list(range(0, 2))
    ),
    # Group 1 includes this user, giving access to folder 1
    # This user has also been given access to folder 2-1
    # This user has also been given individual access to files in folder 2
    "TEST_USER_2": (
        _TEST_USER_2_FILE_IDS
        + _FOLDER_1_FILE_IDS
        + _FOLDER_1_1_FILE_IDS
        + _FOLDER_1_2_FILE_IDS
        + _FOLDER_2_1_FILE_IDS
        + list(range(45, 47))
    ),
    # This user can only see his own files and public files
    "TEST_USER_3": _TEST_USER_3_FILE_IDS,
}

SPECIAL_FILE_ID_TO_CONTENT_MAP: dict[int, str] = {
    61: (
        "Title\n\n"
        "This is a Google Doc with sections - "
        "Section 1\n\n"
        "Section 1 content - "
        "Sub-Section 1-1\n\n"
        "Sub-Section 1-1 content - "
        "Sub-Section 1-2\n\n"
        "Sub-Section 1-2 content - "
        "Section 2\n\n"
        "Section 2 content"
    ),
}


file_name_template = "file_{}.txt"
file_text_template = "This is file {}"


def print_discrepencies(expected: set[str], retrieved: set[str]) -> None:
    if expected != retrieved:
        print(expected)
        print(retrieved)
        print("Extra:")
        print(retrieved - expected)
        print("Missing:")
        print(expected - retrieved)


def get_file_content(file_id: int) -> str:
    if file_id in SPECIAL_FILE_ID_TO_CONTENT_MAP:
        return SPECIAL_FILE_ID_TO_CONTENT_MAP[file_id]

    return file_text_template.format(file_id)


def assert_retrieved_docs_match_expected(
    retrieved_docs: list[Document], expected_file_ids: Sequence[int]
) -> None:
    expected_file_names = {
        file_name_template.format(file_id) for file_id in expected_file_ids
    }
    expected_file_texts = {get_file_content(file_id) for file_id in expected_file_ids}

    retrieved_file_names = set([doc.semantic_identifier for doc in retrieved_docs])
    retrieved_texts = set(
        [
            " - ".join([section.text for section in doc.sections])
            for doc in retrieved_docs
        ]
    )

    # Check file names
    print_discrepencies(expected_file_names, retrieved_file_names)
    assert expected_file_names == retrieved_file_names

    # Check file texts
    print_discrepencies(expected_file_texts, retrieved_texts)
    assert expected_file_texts == retrieved_texts
