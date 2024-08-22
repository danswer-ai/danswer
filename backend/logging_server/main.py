import uvicorn
from fastapi import FastAPI

from danswer import __version__
from logging import getLogger
from logging_server.rest import router as logging_router
from shared_configs.configs import LOGGING_SERVER_HOST
from shared_configs.configs import LOGGING_SERVER_PORT

logger = getLogger(__name__)


def get_model_app() -> FastAPI:
    application = FastAPI(
        title="Danswer Model Server", version=__version__
    )
    application.include_router(logging_router)
    return application


app = get_model_app()


if __name__ == "__main__":
    logger.info("Starting application")
    uvicorn.run(app, host=LOGGING_SERVER_HOST, port=LOGGING_SERVER_PORT)
