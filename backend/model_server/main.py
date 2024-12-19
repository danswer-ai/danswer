import os
import shutil
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

import sentry_sdk
import torch
import uvicorn
from fastapi import FastAPI
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from transformers import logging as transformer_logging  # type:ignore

from model_server.custom_models import router as custom_models_router
from model_server.custom_models import warm_up_intent_model
from model_server.encoders import router as encoders_router
from model_server.management_endpoints import router as management_router
from onyx import __version__
from onyx.utils.logger import setup_logger
from shared_configs.configs import INDEXING_ONLY
from shared_configs.configs import MIN_THREADS_ML_MODELS
from shared_configs.configs import MODEL_SERVER_ALLOWED_HOST
from shared_configs.configs import MODEL_SERVER_PORT
from shared_configs.configs import SENTRY_DSN

os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

HF_CACHE_PATH = Path(os.path.expanduser("~")) / ".cache/huggingface"
TEMP_HF_CACHE_PATH = Path(os.path.expanduser("~")) / ".cache/temp_huggingface"

transformer_logging.set_verbosity_error()

logger = setup_logger()


def _move_files_recursively(source: Path, dest: Path, overwrite: bool = False) -> None:
    """
    This moves the files from the temp huggingface cache to the huggingface cache

    We have to move each file individually because the directories might
    have the same name but not the same contents and we dont want to remove
    the files in the existing huggingface cache that don't exist in the temp
    huggingface cache.
    """

    for item in source.iterdir():
        target_path = dest / item.relative_to(source)
        if item.is_dir():
            _move_files_recursively(item, target_path, overwrite)
        else:
            target_path.parent.mkdir(parents=True, exist_ok=True)
            if target_path.exists() and not overwrite:
                continue
            shutil.move(str(item), str(target_path))


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    if torch.cuda.is_available():
        logger.notice("CUDA GPU is available")
    elif torch.backends.mps.is_available():
        logger.notice("Mac MPS is available")
    else:
        logger.notice("GPU is not available, using CPU")

    if TEMP_HF_CACHE_PATH.is_dir():
        logger.notice("Moving contents of temp_huggingface to huggingface cache.")
        _move_files_recursively(TEMP_HF_CACHE_PATH, HF_CACHE_PATH)
        shutil.rmtree(TEMP_HF_CACHE_PATH, ignore_errors=True)
        logger.notice("Moved contents of temp_huggingface to huggingface cache.")

    torch.set_num_threads(max(MIN_THREADS_ML_MODELS, torch.get_num_threads()))
    logger.notice(f"Torch Threads: {torch.get_num_threads()}")

    if not INDEXING_ONLY:
        warm_up_intent_model()
    else:
        logger.notice("This model server should only run document indexing.")

    yield


def get_model_app() -> FastAPI:
    application = FastAPI(
        title="Onyx Model Server", version=__version__, lifespan=lifespan
    )
    if SENTRY_DSN:
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[StarletteIntegration(), FastApiIntegration()],
            traces_sample_rate=0.1,
        )
        logger.info("Sentry initialized")
    else:
        logger.debug("Sentry DSN not provided, skipping Sentry initialization")

    application.include_router(management_router)
    application.include_router(encoders_router)
    application.include_router(custom_models_router)

    return application


app = get_model_app()


if __name__ == "__main__":
    logger.notice(
        f"Starting Onyx Model Server on http://{MODEL_SERVER_ALLOWED_HOST}:{str(MODEL_SERVER_PORT)}/"
    )
    logger.notice(f"Model Server Version: {__version__}")
    uvicorn.run(app, host=MODEL_SERVER_ALLOWED_HOST, port=MODEL_SERVER_PORT)
