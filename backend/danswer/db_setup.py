
from sqlalchemy.orm import Session
from danswer.chat.load_yamls import load_chat_yamls
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
