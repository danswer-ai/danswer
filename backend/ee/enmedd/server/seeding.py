import os

from pydantic import BaseModel
from sqlalchemy.orm import Session

from ee.enmedd.server.enterprise_settings.models import EnterpriseSettings
from ee.enmedd.server.enterprise_settings.store import store_settings
from ee.enmedd.server.enterprise_settings.store import upload_logo
from enmedd.db.engine import get_session_context_manager
from enmedd.db.llm import fetch_existing_llm_providers
from enmedd.db.llm import update_default_provider
from enmedd.db.llm import upsert_llm_provider
from enmedd.server.manage.llm.models import LLMProviderUpsertRequest
from enmedd.utils.logger import setup_logger


logger = setup_logger()

_SEED_CONFIG_ENV_VAR_NAME = "ENV_SEED_CONFIGURATION"


class SeedConfiguration(BaseModel):
    llms: list[LLMProviderUpsertRequest] | None = None
    admin_user_emails: list[str] | None = None
    seeded_name: str | None = None
    seeded_logo_path: str | None = None


def _parse_env() -> SeedConfiguration | None:
    seed_config_str = os.getenv(_SEED_CONFIG_ENV_VAR_NAME)
    if not seed_config_str:
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
    seeded_providers = [
        upsert_llm_provider(db_session, llm_upsert_request)
        for llm_upsert_request in llm_upsert_requests
    ]
    update_default_provider(db_session, seeded_providers[0].id)


def get_seed_config() -> SeedConfiguration | None:
    return _parse_env()


def seed_db() -> None:
    seed_config = _parse_env()

    if seed_config is None:
        logger.info("No seeding configuration file passed")
        return

    with get_session_context_manager() as db_session:
        if seed_config.llms is not None:
            _seed_llms(db_session, seed_config.llms)

        is_seeded_logo = (
            upload_logo(db_session=db_session, file=seed_config.seeded_logo_path)
            if seed_config.seeded_logo_path
            else False
        )
        seeded_name = seed_config.seeded_name

        if is_seeded_logo or seeded_name:
            logger.info("Seeding enterprise settings")
            seeded_settings = EnterpriseSettings(
                application_name=seeded_name, use_custom_logo=is_seeded_logo
            )
            store_settings(seeded_settings)
