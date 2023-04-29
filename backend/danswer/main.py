import uvicorn
from danswer.configs.app_configs import APP_HOST
from danswer.configs.app_configs import APP_PORT
from danswer.server.admin import router as admin_router
from danswer.server.event_loading import router as event_processing_router
from danswer.server.search_backend import router as backend_router
from danswer.utils.logging import setup_logger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


logger = setup_logger()


def get_application() -> FastAPI:
    application = FastAPI(title="Internal Search QA Backend", debug=True, version="0.1")
    application.include_router(backend_router)
    application.include_router(event_processing_router)
    application.include_router(admin_router)
    return application


app = get_application()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to the list of allowed origins if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


if __name__ == "__main__":
    logger.info(f"Running QA Service on http://{APP_HOST}:{str(APP_PORT)}/")
    uvicorn.run(app, host=APP_HOST, port=APP_PORT)
