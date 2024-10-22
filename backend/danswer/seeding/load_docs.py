from sqlalchemy.orm import Session

from danswer.configs.constants import KV_DOCUMENTS_SEEDED_KEY
from danswer.configs.model_configs import DEFAULT_DOCUMENT_ENCODER_MODEL
from danswer.db.connector import check_connectors_exist
from danswer.db.document import check_docs_exist
from danswer.db.search_settings import get_current_search_settings
from danswer.key_value_store.factory import get_kv_store
from danswer.key_value_store.interface import KvKeyNotFoundError
from danswer.utils.logger import setup_logger


logger = setup_logger()


def seed_initial_documents(db_session: Session) -> None:
    """
    Seed initial documents so users don't have an empty index to start

    Documents are only loaded if:
    - This is the first setup (if the user deletes the docs, we don't load them again)
    - The index is empty, there are no docs and no (non-default) connectors
    - The user has not updated the embedding models
        - If they do, then we have to actually index the website
        - If the embedding model is already updated on server startup, they're not a new user

    Note that regardless of any search settings, the default documents are always loaded with
    the predetermined chunk sizes and single pass embedding.
    """
    logger.info("Seeding initial documents")

    kv_store = get_kv_store()
    try:
        kv_store.load(KV_DOCUMENTS_SEEDED_KEY)
        logger.info("Documents already seeded, skipping")
        return
    except KvKeyNotFoundError:
        pass

    if check_docs_exist(db_session):
        logger.info("Documents already exist, skipping")
        return

    if check_connectors_exist(db_session):
        logger.info("Connectors already exist, skipping")
        return

    search_settings = get_current_search_settings(db_session)
    if search_settings.model_name != DEFAULT_DOCUMENT_ENCODER_MODEL:
        logger.info("Embedding model has been updated, skipping")
        return

    kv_store.store(KV_DOCUMENTS_SEEDED_KEY, True)
