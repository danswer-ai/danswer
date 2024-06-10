import os

from pydantic import BaseModel
from sqlalchemy.orm import Session

from danswer.db.engine import get_session_context_manager
from danswer.db.llm import fetch_existing_llm_providers
from danswer.db.llm import upsert_llm_provider
from danswer.server.manage.llm.models import LLMProviderUpsertRequest
from danswer.utils.logger import setup_logger

logger = setup_logger()

_SEED_CONFIG_ENV_VAR_NAME = "ENV_SEED_CONFIGURATION"


class SeedConfiguration(BaseModel):
    llms: list[LLMProviderUpsertRequest] | None = None
    admin_user_emails: list[str] | None = None


def _parse_env() -> SeedConfiguration | None:
    seed_config_str = os.getenv(_SEED_CONFIG_ENV_VAR_NAME)
    if seed_config_str is None:
        return None

    seed_config = SeedConfiguration.parse_raw(seed_config_str)
    return seed_config


def _seed_llms(
    db_session: Session, llm_upsert_requests: list[LLMProviderUpsertRequest]
) -> None:
    # don't seed LLMs if we've already done this
    existing_llms = fetch_existing_llm_providers(db_session)
    if existing_llms:
        return

    logger.info("Seeding LLMs")
    for llm_upsert_request in llm_upsert_requests:
        upsert_llm_provider(db_session, llm_upsert_request)


def get_seed_config() -> SeedConfiguration | None:
    return _parse_env()


def seed_db() -> None:
    seed_config = _parse_env()
    if seed_config is None:
        return

    with get_session_context_manager() as db_session:
        if seed_config.llms is not None:
            _seed_llms(db_session, seed_config.llms)
