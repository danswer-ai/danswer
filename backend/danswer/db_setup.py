from danswer.search.retrieval.search_runner import download_nltk_data

from danswer.natural_language_processing.search_nlp_models import warm_up_bi_encoder
from danswer.natural_language_processing.search_nlp_models import warm_up_cross_encoder
from danswer.configs.app_configs import DISABLE_INDEX_UPDATE_ON_SWAP
from danswer.db.connector_credential_pair import get_connector_credential_pairs
from danswer.db.connector_credential_pair import resync_cc_pair
from danswer.db.index_attempt import cancel_indexing_attempts_past_model
from danswer.db.index_attempt import expire_index_attempts
from danswer.db.search_settings import get_current_search_settings
from danswer.db.search_settings import get_secondary_search_settings
from danswer.db.swap_index import check_index_swap

from sqlalchemy.orm import Session
from danswer.llm.llm_initialization import load_llm_providers
from danswer.db.connector import create_initial_default_connector
from danswer.db.connector_credential_pair import associate_default_cc_pair
from danswer.db.credentials import create_initial_public_credential
from danswer.db.standard_answer import create_initial_default_standard_answer_category
from danswer.db.persona import delete_old_default_personas
from danswer.chat.load_yamls import load_chat_yamls
from danswer.tools.built_in_tools import auto_add_search_tool_to_personas
from danswer.tools.built_in_tools import load_builtin_tools
from danswer.tools.built_in_tools import refresh_built_in_tools_cache
from danswer.utils.logger import setup_logger

logger = setup_logger()

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
        logger.notice(
            f'Passage embedding prefix: "{search_settings.passage_prefix}"'
        )

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

    # setup Postgres with default credential, llm providers, etc.
    setup_postgres(db_session)

    # Does the user need to trigger a reindexing to bring the document index
    # into a good state, marked in the kv store

    # ensure Vespa is setup correctly
    logger.notice("Verifying Document Index(s) is/are available.")


    logger.notice("Verifying default connector/credential exist.")
    create_initial_public_credential(db_session)
    create_initial_default_connector(db_session)
    associate_default_cc_pair(db_session)

    logger.notice("Verifying default standard answer category exists.")
    create_initial_default_standard_answer_category(db_session)

    logger.notice("Loading LLM providers from env variables")
    load_llm_providers(db_session)

    logger.notice("Loading default Prompts and Personas")
    delete_old_default_personas(db_session)
    load_chat_yamls(db_session)

    logger.notice("Loading built-in tools")
    load_builtin_tools(db_session)
    refresh_built_in_tools_cache(db_session)
    auto_add_search_tool_to_personas(db_session)


def setup_postgres(db_session: Session) -> None:
    logger.notice("Verifying default connector/credential exist.")
    create_initial_public_credential(db_session)
    create_initial_default_connector(db_session)
    associate_default_cc_pair(db_session)

    logger.notice("Verifying default standard answer category exists.")
    create_initial_default_standard_answer_category(db_session)

    logger.notice("Loading LLM providers from env variables")
    load_llm_providers(db_session)

    logger.notice("Loading default Prompts and Personas")
    delete_old_default_personas(db_session)
    load_chat_yamls(db_session)

    logger.notice("Loading built-in tools")
    load_builtin_tools(db_session)
    refresh_built_in_tools_cache(db_session)
    auto_add_search_tool_to_personas(db_session)
