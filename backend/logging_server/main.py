import uvicorn
from fastapi import FastAPI

from danswer import __version__
from danswer.utils.logger import setup_logger
from logging_server.rest import router as logging_router
from shared_configs.configs import LOGGING_SERVER_ALLOWED_HOST
from shared_configs.configs import LOGGING_SERVER_PORT

logger = setup_logger()


def get_model_app() -> FastAPI:
    application = FastAPI(
        title="Danswer Model Server", version=__version__
    )
    application.include_router(logging_router)
    return application


app = get_model_app()


if __name__ == "__main__":
    uvicorn.run(app, host=LOGGING_SERVER_ALLOWED_HOST, port=LOGGING_SERVER_PORT)
