from typing import Any

from onyx.db.models import ConnectorCredentialPair
from onyx.utils.logger import setup_logger
from sqlalchemy.orm import Session

from ee.onyx.external_permissions.permission_sync_utils import DocsWithAdditionalInfo


logger = setup_logger()


def confluence_group_sync(
    db_session: Session,
    cc_pair: ConnectorCredentialPair,
    docs_with_additional_info: list[DocsWithAdditionalInfo],
    sync_details: dict[str, Any],
) -> None:
    logger.debug("Not yet implemented group sync for confluence, no-op")
