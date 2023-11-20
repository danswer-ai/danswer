import nltk  # type:ignore
import torch
import uvicorn
from fastapi import FastAPI
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from httpx_oauth.clients.google import GoogleOAuth2

from danswer import __version__
from danswer.auth.schemas import UserCreate
from danswer.auth.schemas import UserRead
from danswer.auth.schemas import UserUpdate
from danswer.auth.users import auth_backend
from danswer.auth.users import fastapi_users
from danswer.chat.personas import load_personas_from_yaml
from danswer.configs.app_configs import APP_HOST
from danswer.configs.app_configs import APP_PORT
from danswer.configs.app_configs import AUTH_TYPE
from danswer.configs.app_configs import DISABLE_GENERATIVE_AI
from danswer.configs.app_configs import MODEL_SERVER_HOST
from danswer.configs.app_configs import MODEL_SERVER_PORT
from danswer.configs.app_configs import MULTILINGUAL_QUERY_EXPANSION
from danswer.configs.app_configs import OAUTH_CLIENT_ID
from danswer.configs.app_configs import OAUTH_CLIENT_SECRET
from danswer.configs.app_configs import SECRET
from danswer.configs.app_configs import WEB_DOMAIN
from danswer.configs.constants import AuthType
from danswer.configs.model_configs import ASYM_PASSAGE_PREFIX
from danswer.configs.model_configs import ASYM_QUERY_PREFIX
from danswer.configs.model_configs import DOCUMENT_ENCODER_MODEL
from danswer.configs.model_configs import FAST_GEN_AI_MODEL_VERSION
from danswer.configs.model_configs import GEN_AI_API_ENDPOINT
from danswer.configs.model_configs import GEN_AI_MODEL_PROVIDER
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.configs.model_configs import SKIP_RERANKING
from danswer.db.credentials import create_initial_public_credential
from danswer.direct_qa.factory import get_default_qa_model
from danswer.document_index.factory import get_default_document_index
from danswer.llm.factory import get_default_llm
from danswer.server.cc_pair.api import router as cc_pair_router
from danswer.server.chat_backend import router as chat_router
from danswer.server.connector import router as connector_router
from danswer.server.credential import router as credential_router
from danswer.server.document_set import router as document_set_router
from danswer.server.event_loading import router as event_processing_router
from danswer.server.manage import router as admin_router
from danswer.server.search_backend import router as backend_router
from danswer.server.slack_bot_management import router as slack_bot_management_router
from danswer.server.state import router as state_router
from danswer.server.users import router as user_router
from danswer.utils.logger import setup_logger
from danswer.utils.telemetry import optional_telemetry
from danswer.utils.telemetry import RecordType
from danswer.utils.variable_functionality import fetch_versioned_implementation


logger = setup_logger()


def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    exc_str = f"{exc}".replace("\n", " ").replace("   ", " ")
    logger.exception(f"{request}: {exc_str}")
    content = {"status_code": 422, "message": exc_str, "data": None}
    return JSONResponse(content=content, status_code=422)


def value_error_handler(_: Request, exc: ValueError) -> JSONResponse:
    try:
        raise (exc)
    except Exception:
        # log stacktrace
        logger.exception("ValueError")
    return JSONResponse(
        status_code=400,
        content={"message": str(exc)},
    )


def get_application() -> FastAPI:
    application = FastAPI(title="Danswer Backend", version=__version__)
    application.include_router(backend_router)
    application.include_router(chat_router)
    application.include_router(event_processing_router)
    application.include_router(admin_router)
    application.include_router(user_router)
    application.include_router(connector_router)
    application.include_router(credential_router)
    application.include_router(cc_pair_router)
    application.include_router(document_set_router)
    application.include_router(slack_bot_management_router)
    application.include_router(state_router)

    if AUTH_TYPE == AuthType.DISABLED:
        # Server logs this during auth setup verification step
        pass

    elif AUTH_TYPE == AuthType.BASIC:
        application.include_router(
            fastapi_users.get_auth_router(auth_backend),
            prefix="/auth",
            tags=["auth"],
        )
        application.include_router(
            fastapi_users.get_register_router(UserRead, UserCreate),
            prefix="/auth",
            tags=["auth"],
        )
        application.include_router(
            fastapi_users.get_reset_password_router(),
            prefix="/auth",
            tags=["auth"],
        )
        application.include_router(
            fastapi_users.get_verify_router(UserRead),
            prefix="/auth",
            tags=["auth"],
        )
        application.include_router(
            fastapi_users.get_users_router(UserRead, UserUpdate),
            prefix="/users",
            tags=["users"],
        )

    elif AUTH_TYPE == AuthType.GOOGLE_OAUTH:
        oauth_client = GoogleOAuth2(OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET)
        application.include_router(
            fastapi_users.get_oauth_router(
                oauth_client,
                auth_backend,
                SECRET,
                associate_by_email=True,
                is_verified_by_default=True,
                # points the user back to the login page
                redirect_url=f"{WEB_DOMAIN}/auth/oauth/callback",
            ),
            prefix="/auth/oauth",
            tags=["auth"],
        )
        # need basic auth router for `logout` endpoint
        application.include_router(
            fastapi_users.get_logout_router(auth_backend),
            prefix="/auth",
            tags=["auth"],
        )

    application.add_exception_handler(
        RequestValidationError, validation_exception_handler
    )

    application.add_exception_handler(ValueError, value_error_handler)

    @application.on_event("startup")
    def startup_event() -> None:
        # To avoid circular imports
        from danswer.search.search_nlp_models import (
            warm_up_models,
        )

        verify_auth = fetch_versioned_implementation(
            "danswer.auth.users", "verify_auth_setting"
        )
        # Will throw exception if an issue is found
        verify_auth()

        if OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET:
            logger.info("Both OAuth Client ID and Secret are configured.")

        if DISABLE_GENERATIVE_AI:
            logger.info("Generative AI Q&A disabled")
        else:
            logger.info(f"Using LLM Provider: {GEN_AI_MODEL_PROVIDER}")
            logger.info(f"Using LLM Model Version: {GEN_AI_MODEL_VERSION}")
            if GEN_AI_MODEL_VERSION != FAST_GEN_AI_MODEL_VERSION:
                logger.info(
                    f"Using Fast LLM Model Version: {FAST_GEN_AI_MODEL_VERSION}"
                )
            if GEN_AI_API_ENDPOINT:
                logger.info(f"Using LLM Endpoint: {GEN_AI_API_ENDPOINT}")

        if MULTILINGUAL_QUERY_EXPANSION:
            logger.info(
                f"Using multilingual flow with languages: {MULTILINGUAL_QUERY_EXPANSION}"
            )

        if SKIP_RERANKING:
            logger.info("Reranking step of search flow is disabled")

        logger.info(f'Using Embedding model: "{DOCUMENT_ENCODER_MODEL}"')
        if ASYM_QUERY_PREFIX or ASYM_PASSAGE_PREFIX:
            logger.info(f'Query embedding prefix: "{ASYM_QUERY_PREFIX}"')
            logger.info(f'Passage embedding prefix: "{ASYM_PASSAGE_PREFIX}"')

        if MODEL_SERVER_HOST:
            logger.info(
                f"Using Model Server: http://{MODEL_SERVER_HOST}:{MODEL_SERVER_PORT}"
            )
        else:
            logger.info("Warming up local NLP models.")
            if torch.cuda.is_available():
                logger.info("GPU is available")
            else:
                logger.info("GPU is not available")
            logger.info(f"Torch Threads: {torch.get_num_threads()}")

            warm_up_models()

        # This is for the LLM, most LLMs will not need warming up
        get_default_llm().log_model_configs()
        get_default_qa_model().warm_up_model()

        logger.info("Verifying query preprocessing (NLTK) data is downloaded")
        nltk.download("stopwords", quiet=True)
        nltk.download("wordnet", quiet=True)
        nltk.download("punkt", quiet=True)

        logger.info("Verifying public credential exists.")
        create_initial_public_credential()

        logger.info("Loading default Chat Personas")
        load_personas_from_yaml()

        logger.info("Verifying Document Index(s) is/are available.")
        get_default_document_index().ensure_indices_exist()

        optional_telemetry(
            record_type=RecordType.VERSION, data={"version": __version__}
        )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Change this to the list of allowed origins if needed
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return application


app = get_application()


if __name__ == "__main__":
    logger.info(
        f"Starting Danswer Backend version {__version__} on http://{APP_HOST}:{str(APP_PORT)}/"
    )
    uvicorn.run(app, host=APP_HOST, port=APP_PORT)
