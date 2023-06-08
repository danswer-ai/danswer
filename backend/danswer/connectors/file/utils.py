import os
import shutil
import time
import uuid
from pathlib import Path
from typing import Any
from typing import IO

_TEMP_LOCATION = Path("/tmp/file_connector")
_FILE_AGE_CLEANUP_THRESHOLD = 3  # hours


def write_temp_files(files: list[IO[Any]]) -> list[str]:
    """Writes temporary files to disk and returns their paths"""
    os.makedirs(_TEMP_LOCATION, exist_ok=True)

    file_paths: list[str] = []
    for file in files:
        file_path = _TEMP_LOCATION / str(uuid.uuid4())
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
