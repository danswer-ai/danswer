import os
import shutil
import time
import uuid
from pathlib import Path
from typing import Any
from typing import IO

_TEMP_LOCATION = Path("/tmp/file_connector")
_FILE_AGE_CLEANUP_THRESHOLD = 3  # hours
_VALID_FILE_EXTENSIONS = [".txt", ".zip"]


def get_file_ext(file_path_or_name: str | Path) -> str:
    _, extension = os.path.splitext(file_path_or_name)
    return extension


def check_file_ext_is_valid(ext: str) -> bool:
    return ext in _VALID_FILE_EXTENSIONS


def write_temp_files(files: list[tuple[str, IO[Any]]]) -> list[str]:
    """Writes temporary files to disk and returns their paths

    NOTE: need to pass in (file_name, File) tuples since FastAPI's `UploadFile` class
    exposed SpooledTemporaryFile does not include a name.
    """
    os.makedirs(_TEMP_LOCATION, exist_ok=True)

    file_paths: list[str] = []
    for file_name, file in files:
        extension = get_file_ext(file_name)
        if not check_file_ext_is_valid(extension):
            raise ValueError(
                f"Invalid file extension for file: '{file_name}'. Must be one of {_VALID_FILE_EXTENSIONS}"
            )

        file_path = _TEMP_LOCATION / f"{str(uuid.uuid4())}__{file_name}"
        with open(file_path, "wb") as buffer:
            # copy file content from uploaded file to the newly created file
            shutil.copyfileobj(file, buffer)

        file_paths.append(str(file_path.absolute()))

    return file_paths


def file_age_in_hours(filepath: str | Path) -> float:
    return (time.time() - os.path.getmtime(filepath)) / (60 * 60)


def clean_temp_files() -> None:
    os.makedirs(_TEMP_LOCATION, exist_ok=True)
    for file in os.listdir(_TEMP_LOCATION):
        if file_age_in_hours(file) > _FILE_AGE_CLEANUP_THRESHOLD:
            os.remove(_TEMP_LOCATION / file)
