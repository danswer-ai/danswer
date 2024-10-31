from collections.abc import Sequence

from danswer.connectors.models import Document

_ADMIN_FILE_RANGE = list(range(0, 5))
_TEST_USER_1_FILE_RANGE = list(range(5, 10))
_TEST_USER_2_FILE_RANGE = list(range(10, 15))
_TEST_USER_3_FILE_RANGE = list(range(15, 20))
_SHARED_DRIVE_1_FILE_RANGE = list(range(20, 25))
_FOLDER_1_FILE_RANGE = list(range(25, 30))
_FOLDER_1_1_FILE_RANGE = list(range(30, 35))
_FOLDER_1_2_FILE_RANGE = list(range(35, 40))
_SHARED_DRIVE_2_FILE_RANGE = list(range(40, 45))
_FOLDER_2_FILE_RANGE = list(range(45, 50))
_FOLDER_2_1_FILE_RANGE = list(range(50, 55))
_FOLDER_2_2_FILE_RANGE = list(range(55, 60))

_PUBLIC_FOLDER_RANGE = _FOLDER_1_2_FILE_RANGE
_PUBLIC_FILE_RANGE = list(range(55, 57))
PUBLIC_RANGE = _PUBLIC_FOLDER_RANGE + _PUBLIC_FILE_RANGE

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

# All users have access to their own My Drive
DRIVE_MAPPING = {
    "ADMIN": {
        "range": _ADMIN_FILE_RANGE,
        "email": _ADMIN_EMAIL,
        # Admin has access to everything in shared
        "access": (
            _ADMIN_FILE_RANGE
            + _SHARED_DRIVE_1_FILE_RANGE
            + _FOLDER_1_FILE_RANGE
            + _FOLDER_1_1_FILE_RANGE
            + _FOLDER_1_2_FILE_RANGE
            + _SHARED_DRIVE_2_FILE_RANGE
            + _FOLDER_2_FILE_RANGE
            + _FOLDER_2_1_FILE_RANGE
            + _FOLDER_2_2_FILE_RANGE
        ),
    },
    "TEST_USER_1": {
        "range": _TEST_USER_1_FILE_RANGE,
        "email": _TEST_USER_1_EMAIL,
        # This user has access to drive 1
        # This user has redundant access to folder 1 because of group access
        # This user has been given individual access to files in Admin's My Drive
        "access": (
            _TEST_USER_1_FILE_RANGE
            + _SHARED_DRIVE_1_FILE_RANGE
            + _FOLDER_1_FILE_RANGE
            + _FOLDER_1_1_FILE_RANGE
            + _FOLDER_1_2_FILE_RANGE
            + list(range(0, 2))
        ),
    },
    "TEST_USER_2": {
        "range": _TEST_USER_2_FILE_RANGE,
        "email": _TEST_USER_2_EMAIL,
        # Group 1 includes this user, giving access to folder 1
        # This user has also been given access to folder 2-1
        # This user has also been given individual access to files in folder 2
        "access": (
            _TEST_USER_2_FILE_RANGE
            + _FOLDER_1_FILE_RANGE
            + _FOLDER_1_1_FILE_RANGE
            + _FOLDER_1_2_FILE_RANGE
            + _FOLDER_2_1_FILE_RANGE
            + list(range(45, 47))
        ),
    },
    "TEST_USER_3": {
        "range": _TEST_USER_3_FILE_RANGE,
        "email": _TEST_USER_3_EMAIL,
        # This user can only see his own files and public files
        "access": (_TEST_USER_3_FILE_RANGE),
    },
    "SHARED_DRIVE_1": {"range": _SHARED_DRIVE_1_FILE_RANGE, "url": _SHARED_DRIVE_1_URL},
    "FOLDER_1": {"range": _FOLDER_1_FILE_RANGE, "url": _FOLDER_1_URL},
    "FOLDER_1_1": {"range": _FOLDER_1_1_FILE_RANGE, "url": _FOLDER_1_1_URL},
    "FOLDER_1_2": {"range": _FOLDER_1_2_FILE_RANGE, "url": _FOLDER_1_2_URL},
    "SHARED_DRIVE_2": {"range": _SHARED_DRIVE_2_FILE_RANGE, "url": _SHARED_DRIVE_2_URL},
    "FOLDER_2": {"range": _FOLDER_2_FILE_RANGE, "url": _FOLDER_2_URL},
    "FOLDER_2_1": {"range": _FOLDER_2_1_FILE_RANGE, "url": _FOLDER_2_1_URL},
    "FOLDER_2_2": {"range": _FOLDER_2_2_FILE_RANGE, "url": _FOLDER_2_2_URL},
}


file_name_template = "file_{}.txt"
file_text_template = "This is file {}"


def get_expected_file_names_and_texts(
    expected_file_range: list[int],
) -> tuple[set[str], set[str]]:
    file_names = [file_name_template.format(i) for i in expected_file_range]
    file_texts = [file_text_template.format(i) for i in expected_file_range]
    return set(file_names), set(file_texts)


def validate_file_names_and_texts(
    docs: list[Document], expected_file_range: list[int]
) -> None:
    expected_file_names, expected_file_texts = get_expected_file_names_and_texts(
        expected_file_range
    )

    retrieved_file_names = set([doc.semantic_identifier for doc in docs])
    retrieved_texts = set([doc.sections[0].text for doc in docs])

    # Check file names
    if expected_file_names != retrieved_file_names:
        print(expected_file_names)
        print(retrieved_file_names)
        print("Extra:")
        print(retrieved_file_names - expected_file_names)
        print("Missing:")
        print(expected_file_names - retrieved_file_names)
    assert (
        expected_file_names == retrieved_file_names
    ), "Not all expected file names were found"

    # Check file texts
    if expected_file_texts != retrieved_texts:
        print(expected_file_texts)
        print(retrieved_texts)
        print("Extra:")
        print(retrieved_texts - expected_file_texts)
        print("Missing:")
        print(expected_file_texts - retrieved_texts)
    assert (
        expected_file_texts == retrieved_texts
    ), "Not all expected file texts were found"


def flatten_file_ranges(file_ranges: list[Sequence[object]]) -> list[int]:
    expected_file_range = []
    for range in file_ranges:
        if isinstance(range, list):
            for i in range:
                if isinstance(i, int):
                    expected_file_range.append(i)
                else:
                    raise ValueError(f"Expected int, got {type(i)}")
        else:
            raise ValueError(f"Expected list, got {type(range)}")
    return expected_file_range
