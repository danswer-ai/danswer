from danswer.db.models import ConnectorCredentialPair
from danswer.db.models import IndexingStatus


def check_deletion_attempt_is_allowed(
    connector_credential_pair: ConnectorCredentialPair,
) -> bool:
    """
    To be deletable:
        (1) connector should be disabled
        (2) there should be no in-progress/planned index attempts
    """
    return bool(
        connector_credential_pair.connector.disabled
        and (
            connector_credential_pair.last_attempt_status != IndexingStatus.IN_PROGRESS
            and connector_credential_pair.last_attempt_status
            != IndexingStatus.NOT_STARTED
        )
    )
