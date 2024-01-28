import torch
import uvicorn
from fastapi import FastAPI

from danswer import __version__
from danswer.configs.app_configs import MODEL_SERVER_ALLOWED_HOST
from danswer.configs.app_configs import MODEL_SERVER_PORT
from danswer.configs.model_configs import MIN_THREADS_ML_MODELS
from danswer.utils.logger import setup_logger
from model_server.custom_models import router as custom_models_router
from model_server.custom_models import warm_up_intent_model
from model_server.encoders import router as encoders_router
from model_server.encoders import warm_up_cross_encoders


logger = setup_logger()


def get_model_app() -> FastAPI:
    application = FastAPI(title="Danswer Model Server", version=__version__)

    application.include_router(encoders_router)
    application.include_router(custom_models_router)

    @application.on_event("startup")
    def startup_event() -> None:
        if torch.cuda.is_available():
            logger.info("GPU is available")
        else:
            logger.info("GPU is not available")

        torch.set_num_threads(max(MIN_THREADS_ML_MODELS, torch.get_num_threads()))
        logger.info(f"Torch Threads: {torch.get_num_threads()}")

        warm_up_cross_encoders()
        warm_up_intent_model()

    return application


app = get_model_app()


if __name__ == "__main__":
    logger.info(
        f"Starting Danswer Model Server on http://{MODEL_SERVER_ALLOWED_HOST}:{str(MODEL_SERVER_PORT)}/"
    )
    logger.info(f"Model Server Version: {__version__}")
    uvicorn.run(app, host=MODEL_SERVER_ALLOWED_HOST, port=MODEL_SERVER_PORT)
