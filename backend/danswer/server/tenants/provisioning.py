import contextlib
import os

from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.schema import CreateSchema

from alembic import command
from alembic.config import Config
from danswer.chat.load_yamls import load_chat_yamls
from danswer.configs.app_configs import DISABLE_INDEX_UPDATE_ON_SWAP
from danswer.db.connector import create_initial_default_connector
from danswer.db.connector_credential_pair import associate_default_cc_pair
from danswer.db.connector_credential_pair import get_connector_credential_pairs
from danswer.db.connector_credential_pair import resync_cc_pair
from danswer.db.credentials import create_initial_public_credential
from danswer.db.engine import build_connection_string
from danswer.db.engine import get_async_session
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.index_attempt import cancel_indexing_attempts_past_model
from danswer.db.index_attempt import expire_index_attempts
from danswer.db.persona import delete_old_default_personas
from danswer.db.search_settings import get_current_search_settings
from danswer.db.search_settings import get_secondary_search_settings
from danswer.db.swap_index import check_index_swap
from danswer.db_setup import setup_postgres
from danswer.natural_language_processing.search_nlp_models import warm_up_cross_encoder
from danswer.search.retrieval.search_runner import download_nltk_data
from danswer.tools.built_in_tools import auto_add_search_tool_to_personas
from danswer.tools.built_in_tools import load_builtin_tools
from danswer.tools.built_in_tools import refresh_built_in_tools_cache
from danswer.utils.logger import setup_logger
from ee.danswer.db.standard_answer import (
    create_initial_default_standard_answer_category,
)

logger = setup_logger()


def run_alembic_migrations(schema_name: str) -> None:
    logger.info(f"Starting Alembic migrations for schema: {schema_name}")
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        alembic_ini_path = os.path.join(root_dir, "alembic.ini")

        # Configure Alembic
        alembic_cfg = Config(alembic_ini_path)
        alembic_cfg.set_main_option("sqlalchemy.url", build_connection_string())

        # Prepare the x arguments
        x_arguments = [f"schema={schema_name}"]
        alembic_cfg.cmd_opts.x = x_arguments  # type: ignore

        # Run migrations programmatically
        command.upgrade(alembic_cfg, "head")

        logger.info(
            f"Alembic migrations completed successfully for schema: {schema_name}"
        )

    except Exception as e:
        logger.exception(f"Alembic migration failed for schema {schema_name}: {str(e)}")
        raise


def create_tenant_schema(tenant_id: str) -> None:
    with Session(get_sqlalchemy_engine()) as db_session:
        with db_session.begin():
            result = db_session.execute(
                text(
                    """
                    SELECT schema_name
                    FROM information_schema.schemata
                    WHERE schema_name = :schema_name
                """
                ),
                {"schema_name": tenant_id},
            )
            schema_exists = result.scalar() is not None

            if not schema_exists:
                db_session.execute(CreateSchema(tenant_id))
                logger.info(f"Schema {tenant_id} created")
            else:
                logger.info(f"Schema {tenant_id} already exists")


def setup_postgres_and_initial_settings(db_session: Session) -> None:
    check_index_swap(db_session=db_session)
    search_settings = get_current_search_settings(db_session)
    secondary_search_settings = get_secondary_search_settings(db_session)

    # Break bad state for thrashing indexes
    if secondary_search_settings and DISABLE_INDEX_UPDATE_ON_SWAP:
        expire_index_attempts(
            search_settings_id=search_settings.id, db_session=db_session
        )

        for cc_pair in get_connector_credential_pairs(db_session):
            resync_cc_pair(cc_pair, db_session=db_session)

    # Expire all old embedding models indexing attempts, technically redundant
    cancel_indexing_attempts_past_model(db_session)

    logger.notice(f'Using Embedding model: "{search_settings.model_name}"')
    if search_settings.query_prefix or search_settings.passage_prefix:
        logger.notice(f'Query embedding prefix: "{search_settings.query_prefix}"')
        logger.notice(f'Passage embedding prefix: "{search_settings.passage_prefix}"')

    if search_settings:
        if not search_settings.disable_rerank_for_streaming:
            logger.notice("Reranking is enabled.")

        if search_settings.multilingual_expansion:
            logger.notice(
                f"Multilingual query expansion is enabled with {search_settings.multilingual_expansion}."
            )

    if search_settings.rerank_model_name and not search_settings.provider_type:
        warm_up_cross_encoder(search_settings.rerank_model_name)

    logger.notice("Verifying query preprocessing (NLTK) data is downloaded")
    download_nltk_data()

    # setup Postgres with default credentials, llm providers, etc.
    setup_postgres(db_session)

    # ensure Vespa is setup correctly
    logger.notice("Verifying Document Index(s) is/are available.")

    logger.notice("Verifying default connector/credential exist.")
    create_initial_public_credential(db_session)
    create_initial_default_connector(db_session)
    associate_default_cc_pair(db_session)

    logger.notice("Verifying default standard answer category exists.")
    create_initial_default_standard_answer_category(db_session)

    logger.notice("Loading default Prompts and Personas")
    delete_old_default_personas(db_session)
    load_chat_yamls(db_session)

    logger.notice("Loading built-in tools")
    load_builtin_tools(db_session)
    refresh_built_in_tools_cache(db_session)
    auto_add_search_tool_to_personas(db_session)


async def check_schema_exists(tenant_id: str) -> bool:
    get_async_session_context = contextlib.asynccontextmanager(get_async_session)
    async with get_async_session_context() as session:
        result = await session.execute(
            text(
                "SELECT schema_name FROM information_schema.schemata WHERE schema_name = :schema_name"
            ),
            {"schema_name": tenant_id},
        )
        return result.scalar() is not None
