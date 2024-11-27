import contextvars
import logging
import os
from collections.abc import MutableMapping
from logging.handlers import RotatingFileHandler
from typing import Any

from shared_configs.configs import DEV_LOGGING_ENABLED
from shared_configs.configs import LOG_FILE_NAME
from shared_configs.configs import LOG_LEVEL
from shared_configs.configs import MULTI_TENANT
from shared_configs.configs import POSTGRES_DEFAULT_SCHEMA
from shared_configs.configs import SLACK_CHANNEL_ID
from shared_configs.configs import TENANT_ID_PREFIX
from shared_configs.contextvars import CURRENT_TENANT_ID_CONTEXTVAR


logging.addLevelName(logging.INFO + 5, "NOTICE")

pruning_ctx: contextvars.ContextVar[dict[str, Any]] = contextvars.ContextVar(
    "pruning_ctx", default=dict()
)

doc_permission_sync_ctx: contextvars.ContextVar[dict[str, Any]] = (
    contextvars.ContextVar("doc_permission_sync_ctx", default=dict())
)


class TaskAttemptSingleton:
    """Used to tell if this process is an indexing job, and if so what is the
    unique identifier for this indexing attempt. For things like the API server,
    main background job (scheduler), etc. this will not be used."""

    _INDEX_ATTEMPT_ID: None | int = None
    _CONNECTOR_CREDENTIAL_PAIR_ID: None | int = None

    @classmethod
    def get_index_attempt_id(cls) -> None | int:
        return cls._INDEX_ATTEMPT_ID

    @classmethod
    def get_connector_credential_pair_id(cls) -> None | int:
        return cls._CONNECTOR_CREDENTIAL_PAIR_ID

    @classmethod
    def set_cc_and_index_id(
        cls, index_attempt_id: int, connector_credential_pair_id: int
    ) -> None:
        cls._INDEX_ATTEMPT_ID = index_attempt_id
        cls._CONNECTOR_CREDENTIAL_PAIR_ID = connector_credential_pair_id


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


class DanswerLoggingAdapter(logging.LoggerAdapter):
    def process(
        self, msg: str, kwargs: MutableMapping[str, Any]
    ) -> tuple[str, MutableMapping[str, Any]]:
        # If this is an indexing job, add the attempt ID to the log message
        # This helps filter the logs for this specific indexing
        index_attempt_id = TaskAttemptSingleton.get_index_attempt_id()
        cc_pair_id = TaskAttemptSingleton.get_connector_credential_pair_id()

        doc_permission_sync_ctx_dict = doc_permission_sync_ctx.get()
        pruning_ctx_dict = pruning_ctx.get()
        if len(pruning_ctx_dict) > 0:
            if "request_id" in pruning_ctx_dict:
                msg = f"[Prune: {pruning_ctx_dict['request_id']}] {msg}"

            if "cc_pair_id" in pruning_ctx_dict:
                msg = f"[CC Pair: {pruning_ctx_dict['cc_pair_id']}] {msg}"
        elif len(doc_permission_sync_ctx_dict) > 0:
            if "request_id" in doc_permission_sync_ctx_dict:
                msg = f"[Doc Permissions Sync: {doc_permission_sync_ctx_dict['request_id']}] {msg}"
        else:
            if index_attempt_id is not None:
                msg = f"[Index Attempt: {index_attempt_id}] {msg}"

            if cc_pair_id is not None:
                msg = f"[CC Pair: {cc_pair_id}] {msg}"

        # Add tenant information if it differs from default
        # This will always be the case for authenticated API requests
        if MULTI_TENANT:
            tenant_id = CURRENT_TENANT_ID_CONTEXTVAR.get()
            if tenant_id != POSTGRES_DEFAULT_SCHEMA:
                # Strip tenant_ prefix and take first 8 chars for cleaner logs
                tenant_display = tenant_id.removeprefix(TENANT_ID_PREFIX)
                short_tenant = (
                    tenant_display[:8] if len(tenant_display) > 8 else tenant_display
                )
                msg = f"[t:{short_tenant}] {msg}"

        # For Slack Bot, logs the channel relevant to the request
        channel_id = self.extra.get(SLACK_CHANNEL_ID) if self.extra else None
        if channel_id:
            msg = f"[Channel ID: {channel_id}] {msg}"

        return msg, kwargs

    def notice(self, msg: Any, *args: Any, **kwargs: Any) -> None:
        # Stacklevel is set to 2 to point to the actual caller of notice instead of here
        self.log(
            logging.getLevelName("NOTICE"), str(msg), *args, **kwargs, stacklevel=2
        )


class PlainFormatter(logging.Formatter):
    """Adds log levels."""

    def format(self, record: logging.LogRecord) -> str:
        levelname = record.levelname
        level_display = f"{levelname}:"
        formatted_message = super().format(record)
        return f"{level_display.ljust(9)} {formatted_message}"


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


DANSWER_DOCKER_ENV_STR = "DANSWER_RUNNING_IN_DOCKER"


def is_running_in_container() -> bool:
    return os.getenv(DANSWER_DOCKER_ENV_STR) == "true"


def setup_logger(
    name: str = __name__,
    log_level: int = get_log_level_from_str(),
    extra: MutableMapping[str, Any] | None = None,
) -> DanswerLoggingAdapter:
    logger = logging.getLogger(name)

    # If the logger already has handlers, assume it was already configured and return it.
    if logger.handlers:
        return DanswerLoggingAdapter(logger, extra=extra)

    logger.setLevel(log_level)

    formatter = get_standard_formatter()

    handler = logging.StreamHandler()
    handler.setLevel(log_level)
    handler.setFormatter(formatter)

    logger.addHandler(handler)

    uvicorn_logger = logging.getLogger("uvicorn.access")
    if uvicorn_logger:
        uvicorn_logger.handlers = []
        uvicorn_logger.addHandler(handler)
        uvicorn_logger.setLevel(log_level)

    is_containerized = is_running_in_container()
    if LOG_FILE_NAME and (is_containerized or DEV_LOGGING_ENABLED):
        log_levels = ["debug", "info", "notice"]
        for level in log_levels:
            file_name = (
                f"/var/log/{LOG_FILE_NAME}_{level}.log"
                if is_containerized
                else f"./log/{LOG_FILE_NAME}_{level}.log"
            )
            file_handler = RotatingFileHandler(
                file_name,
                maxBytes=25 * 1024 * 1024,  # 25 MB
                backupCount=5,  # Keep 5 backup files
            )
            file_handler.setLevel(get_log_level_from_str(level))
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)

            if uvicorn_logger:
                uvicorn_logger.addHandler(file_handler)

    logger.notice = lambda msg, *args, **kwargs: logger.log(logging.getLevelName("NOTICE"), msg, *args, **kwargs)  # type: ignore

    return DanswerLoggingAdapter(logger, extra=extra)


def print_loggers() -> None:
    """Print information about all loggers. Use to debug logging issues."""
    root_logger = logging.getLogger()
    loggers: list[logging.Logger | logging.PlaceHolder] = [root_logger]
    loggers.extend(logging.Logger.manager.loggerDict.values())

    for logger in loggers:
        if isinstance(logger, logging.PlaceHolder):
            # Skip placeholders that aren't actual loggers
            continue

        print(f"Logger: '{logger.name}' (Level: {logging.getLevelName(logger.level)})")
        if logger.handlers:
            for handler in logger.handlers:
                print(f"  Handler: {handler}")
        else:
            print("  No handlers")

        print(f"  Propagate: {logger.propagate}")
        print()
