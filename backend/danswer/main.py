import nltk  # type:ignore
import uvicorn
from fastapi import FastAPI
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from danswer.auth.schemas import UserCreate
from danswer.auth.schemas import UserRead
from danswer.auth.schemas import UserUpdate
from danswer.auth.users import auth_backend
from danswer.auth.users import fastapi_users
from danswer.auth.users import oauth_client
from danswer.chat.personas import load_personas_from_yaml
from danswer.configs.app_configs import APP_HOST
from danswer.configs.app_configs import APP_PORT
from danswer.configs.app_configs import DISABLE_AUTH
from danswer.configs.app_configs import DISABLE_GENERATIVE_AI
from danswer.configs.app_configs import ENABLE_OAUTH
from danswer.configs.app_configs import OAUTH_CLIENT_ID
from danswer.configs.app_configs import OAUTH_CLIENT_SECRET
from danswer.configs.app_configs import OAUTH_TYPE
from danswer.configs.app_configs import OPENID_CONFIG_URL
from danswer.configs.app_configs import SECRET
from danswer.configs.app_configs import WEB_DOMAIN
from danswer.configs.model_configs import API_BASE_OPENAI
from danswer.configs.model_configs import API_TYPE_OPENAI
from danswer.configs.model_configs import ASYM_PASSAGE_PREFIX
from danswer.configs.model_configs import ASYM_QUERY_PREFIX
from danswer.configs.model_configs import DOCUMENT_ENCODER_MODEL
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.configs.model_configs import INTERNAL_MODEL_VERSION
from danswer.configs.model_configs import SKIP_RERANKING
from danswer.datastores.document_index import get_default_document_index
from danswer.db.credentials import create_initial_public_credential
from danswer.direct_qa.llm_utils import get_default_qa_model
from danswer.server.chat_backend import router as chat_router
from danswer.server.credential import router as credential_router
from danswer.server.document_set import router as document_set_router
from danswer.server.event_loading import router as event_processing_router
from danswer.server.health import router as health_router
from danswer.server.manage import router as admin_router
from danswer.server.search_backend import router as backend_router
from danswer.server.slack_bot_management import router as slack_bot_management_router
from danswer.server.users import router as user_router
from danswer.utils.acl import set_acl_for_vespa
from danswer.utils.logger import setup_logger


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
    application = FastAPI(title="Internal Search QA Backend", debug=True, version="0.1")
    application.include_router(backend_router)
    application.include_router(chat_router)
    application.include_router(event_processing_router)
    application.include_router(admin_router)
    application.include_router(user_router)
    application.include_router(credential_router)
    application.include_router(document_set_router)
    application.include_router(slack_bot_management_router)
    application.include_router(health_router)

    application.include_router(
        fastapi_users.get_auth_router(auth_backend),
        prefix="/auth/database",
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
    if ENABLE_OAUTH:
        if oauth_client is None:
            raise RuntimeError("OAuth is enabled but no OAuth client is configured")

        if OAUTH_TYPE == "google":
            # special case for google
            application.include_router(
                fastapi_users.get_oauth_router(
                    oauth_client,
                    auth_backend,
                    SECRET,
                    associate_by_email=True,
                    is_verified_by_default=True,
                    # points the user back to the login page, where we will call the
                    # /auth/google/callback endpoint + redirect them to the main app
                    redirect_url=f"{WEB_DOMAIN}/auth/google/callback",
                ),
                prefix="/auth/google",
                tags=["auth"],
            )
        application.include_router(
            fastapi_users.get_oauth_router(
                oauth_client,
                auth_backend,
                SECRET,
                associate_by_email=True,
                is_verified_by_default=True,
                # points the user back to the login page, where we will call the
                # /auth/oauth/callback endpoint + redirect them to the main app
                redirect_url=f"{WEB_DOMAIN}/auth/oauth/callback",
            ),
            prefix="/auth/oauth",
            tags=["auth"],
        )
        application.include_router(
            fastapi_users.get_oauth_associate_router(oauth_client, UserRead, SECRET),
            prefix="/auth/associate/oauth",
            tags=["auth"],
        )

    application.add_exception_handler(
        RequestValidationError, validation_exception_handler
    )

    application.add_exception_handler(ValueError, value_error_handler)

    @application.on_event("startup")
    def startup_event() -> None:
        # To avoid circular imports
        from danswer.search.search_utils import (
            warm_up_models,
        )

        if DISABLE_GENERATIVE_AI:
            logger.info("Generative AI Q&A disabled")
        else:
            logger.info(f"Using Internal Model: {INTERNAL_MODEL_VERSION}")
            logger.info(f"Actual LLM model version: {GEN_AI_MODEL_VERSION}")
            if API_TYPE_OPENAI == "azure":
                logger.info(f"Using Azure OpenAI with Endpoint: {API_BASE_OPENAI}")

        auth_status = "off" if DISABLE_AUTH else "on"
        logger.info(f"User Authentication is turned {auth_status}")

        if not DISABLE_AUTH:
            if not ENABLE_OAUTH:
                logger.debug("OAuth is turned off")
            else:
                if not OAUTH_CLIENT_ID:
                    logger.warning("OAuth is turned on but OAUTH_CLIENT_ID is empty")
                if not OAUTH_CLIENT_SECRET:
                    logger.warning(
                        "OAuth is turned on but OAUTH_CLIENT_SECRET is empty"
                    )
                if OAUTH_TYPE == "openid" and not OPENID_CONFIG_URL:
                    logger.warning("OpenID is turned on but OPENID_CONFIG_URL is emtpy")
                else:
                    logger.debug("OAuth is turned on")

        if SKIP_RERANKING:
            logger.info("Reranking step of search flow is disabled")

        logger.info(f'Using Embedding model: "{DOCUMENT_ENCODER_MODEL}"')
        logger.info(f'Query embedding prefix: "{ASYM_QUERY_PREFIX}"')
        logger.info(f'Passage embedding prefix: "{ASYM_PASSAGE_PREFIX}"')

        logger.info("Warming up local NLP models.")
        warm_up_models()
        qa_model = get_default_qa_model()
        qa_model.warm_up_model()

        logger.info("Verifying query preprocessing (NLTK) data is downloaded")
        nltk.download("stopwords")
        nltk.download("wordnet")
        nltk.download("punkt")

        logger.info("Verifying public credential exists.")
        create_initial_public_credential()

        logger.info("Loading default Chat Personas")
        load_personas_from_yaml()

        logger.info("Verifying Document Index(s) is/are available.")
        get_default_document_index().ensure_indices_exist()

        # TODO: remove this once everyone is migrated to ACL
        logger.info("Populating Access Control List fields in Vespa")
        set_acl_for_vespa()

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
