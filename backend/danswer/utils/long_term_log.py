import json
import os
import threading
from datetime import datetime
from pathlib import Path
from typing import Any

from danswer.utils.logger import setup_logger
from danswer.utils.special_types import JSON_ro

logger = setup_logger()

_LOG_FILE_NAME_TIMESTAMP_FORMAT = "%Y-%m-%d_%H-%M-%S-%f"


class LongTermLogger:
    """NOTE: should support a LOT of data AND should be extremely fast,
    ideally done in a background thread."""

    def __init__(
        self,
        metadata: dict[str, str] | None = None,
        log_file_path: str = "/tmp/log_term_log",
    ):
        self.metadata = metadata
        self.log_file_path = Path(log_file_path)
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(log_file_path), exist_ok=True)
        except Exception as e:
            logger.error(f"Error creating directory for long-term logs: {e}")

    def _record(self, message: Any, category: str) -> None:
        category_path = self.log_file_path / category
        try:
            # Create directory if it doesn't exist
            os.makedirs(category_path, exist_ok=True)
        except Exception as e:
            logger.error(f"Error creating category directory for long-term logs: {e}")
            return

        final_record = {
            "metadata": self.metadata,
            "record": message,
        }

        file_path = (
            category_path
            / f"{datetime.now().strftime(_LOG_FILE_NAME_TIMESTAMP_FORMAT)}.json"
        )
        with open(file_path, "w+") as f:
            json.dump(final_record, f)

    def record(self, message: JSON_ro, category: str = "default") -> None:
        try:
            # Run in separate thread to have minimal overhead in main flows
            thread = threading.Thread(
                target=self._record, args=(message, category), daemon=True
            )
            thread.start()
        except Exception:
            # Should never interfere with normal functions of Danswer
            pass

    def fetch_category(
        self,
        category: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 100,
    ) -> list[JSON_ro]:
        category_path = self.log_file_path / category
        files = list(category_path.glob("*.json"))

        results: list[JSON_ro] = []
        for file in files:
            # Parse timestamp from filename (YYYY-MM-DD_HH-MM-SS.json)
            try:
                file_time = datetime.strptime(
                    file.stem, _LOG_FILE_NAME_TIMESTAMP_FORMAT
                )

                # Skip if outside time range
                if start_time and file_time < start_time:
                    continue
                if end_time and file_time > end_time:
                    continue

                results.append(json.loads(file.read_text()))
            except ValueError:
                # Skip files that don't match expected format
                continue

        return results
