from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.access.models import DocumentAccess
from danswer.datastores.document_index import get_default_document_index
from danswer.datastores.interfaces import UpdateRequest
from danswer.datastores.vespa.store import VespaIndex
from danswer.db.document import get_acccess_info_for_documents
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.models import Document
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.utils.logger import setup_logger

logger = setup_logger()


_COMPLETED_ACL_UPDATE_KEY = "completed_acl_update"


def set_acl_for_vespa(should_check_if_already_done: bool = False) -> None:
    """Updates the ACL for all documents based on the state of Postgres."""
    dynamic_config_store = get_dynamic_config_store()
    if should_check_if_already_done:
        try:
            # if entry is found, then we've already done this
            dynamic_config_store.load(_COMPLETED_ACL_UPDATE_KEY)
            return
        except ConfigNotFoundError:
            pass

    vespa_index = get_default_document_index()
    if not isinstance(vespa_index, VespaIndex):
        raise ValueError("This script is only for Vespa indexes")

    with Session(get_sqlalchemy_engine()) as db_session:
        # for all documents, set the `access_control_list` field apporpriately
        # based on the state of Postgres
        documents = db_session.scalars(select(Document)).all()
        document_access_info = get_acccess_info_for_documents(
            db_session=db_session,
            document_ids=[document.id for document in documents],
        )
        vespa_index.update(
            update_requests=[
                UpdateRequest(
                    document_ids=[document_id],
                    access=DocumentAccess.build(user_ids, is_public),
                )
                for document_id, user_ids, is_public in document_access_info
            ],
        )

    dynamic_config_store.store(_COMPLETED_ACL_UPDATE_KEY, True)
