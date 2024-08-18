import logging
import os
from collections.abc import MutableMapping
from typing import Any

from shared_configs.configs import LOG_LEVEL


logging.addLevelName(logging.INFO + 5, "NOTICE")


class IndexAttemptSingleton:
    """Used to tell if this process is an indexing job, and if so what is the
    unique identifier for this indexing attempt. For things like the API server,
    main background job (scheduler), etc. this will not be used."""

    _INDEX_ATTEMPT_ID: None | int = None

    @classmethod
    def get_index_attempt_id(cls) -> None | int:
        return cls._INDEX_ATTEMPT_ID

    @classmethod
    def set_index_attempt_id(cls, index_attempt_id: int) -> None:
        cls._INDEX_ATTEMPT_ID = index_attempt_id


def get_log_level_from_str(log_level_str: str = LOG_LEVEL) -> int:
    log_level_dict = {
        "CRITICAL": logging.CRITICAL,
        "ERROR": logging.ERROR,
        "WARNING": logging.WARNING,
        "NOTICE": logging.getLevelName("NOTICE"),
        "INFO": logging.INFO,
        "DEBUG": logging.DEBUG,
        "NOTSET": logging.NOTSET,
    }

    return log_level_dict.get(log_level_str.upper(), logging.getLevelName("NOTICE"))


class _IndexAttemptLoggingAdapter(logging.LoggerAdapter):
    """This is used to globally add the index attempt id to all log messages
    during indexing by workers. This is done so that the logs can be filtered
    by index attempt ID to get a better idea of what happened during a specific
    indexing attempt. If the index attempt ID is not set, then this adapter
    is a no-op."""

    def process(
        self, msg: str, kwargs: MutableMapping[str, Any]
    ) -> tuple[str, MutableMapping[str, Any]]:
        attempt_id = IndexAttemptSingleton.get_index_attempt_id()
        if attempt_id is None:
            return msg, kwargs

        return f"[Attempt ID: {attempt_id}] {msg}", kwargs

    def notice(self, msg: str, *args: Any, **kwargs: Any) -> None:
        self.log(logging.getLevelName("NOTICE"), msg, *args, **kwargs)


class ColoredFormatter(logging.Formatter):
    """Custom formatter to add colors to log levels."""

    COLORS = {
        "CRITICAL": "\033[91m",  # Red
        "ERROR": "\033[91m",  # Red
        "WARNING": "\033[93m",  # Yellow
        "NOTICE": "\033[94m",  # Blue
        "INFO": "\033[92m",  # Green
        "DEBUG": "\033[96m",  # Light Green
        "NOTSET": "\033[91m",  # Reset
    }

    def format(self, record: logging.LogRecord) -> str:
        levelname = record.levelname
        if levelname in self.COLORS:
            prefix = self.COLORS[levelname]
            suffix = "\033[0m"
            formatted_message = super().format(record)
            # Ensure the levelname with colon is 9 characters long
            # accounts for the extra characters for coloring
            level_display = f"{prefix}{levelname}{suffix}:"
            return f"{level_display.ljust(18)} {formatted_message}"
        return super().format(record)


def get_standard_formatter() -> ColoredFormatter:
    """Returns a standard colored logging formatter."""
    return ColoredFormatter(
        "%(asctime)s %(filename)30s %(lineno)4s: %(message)s",
        datefmt="%m/%d/%Y %I:%M:%S %p",
    )


def setup_logger(
    name: str = __name__,
    log_level: int = get_log_level_from_str(),
    logfile_name: str | None = None,
) -> _IndexAttemptLoggingAdapter:
    logger = logging.getLogger(name)

    # If the logger already has handlers, assume it was already configured and return it.
    if logger.handlers:
        return _IndexAttemptLoggingAdapter(logger)

    logger.setLevel(log_level)

    formatter = get_standard_formatter()

    handler = logging.StreamHandler()
    handler.setLevel(log_level)
    handler.setFormatter(formatter)

    logger.addHandler(handler)

    if logfile_name:
        is_containerized = os.path.exists("/.dockerenv")
        file_name_template = (
            "/var/log/{name}.log" if is_containerized else "./log/{name}.log"
        )
        file_handler = logging.FileHandler(file_name_template.format(name=logfile_name))
        logger.addHandler(file_handler)

    logger.notice = lambda msg, *args, **kwargs: logger.log(logging.getLevelName("NOTICE"), msg, *args, **kwargs)  # type: ignore

    return _IndexAttemptLoggingAdapter(logger)


def setup_uvicorn_logger() -> None:
    logger = logging.getLogger("uvicorn.access")
    handler = logging.StreamHandler()
    handler.setLevel(LOG_LEVEL)

    formatter = get_standard_formatter()
    handler.setFormatter(formatter)

    logger.handlers = [handler]
