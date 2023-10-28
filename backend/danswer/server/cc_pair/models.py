from pydantic import BaseModel

from danswer.db.models import ConnectorCredentialPair
from danswer.db.models import IndexAttempt
from danswer.server.models import ConnectorSnapshot
from danswer.server.models import CredentialSnapshot
from danswer.server.models import DeletionAttemptSnapshot
from danswer.server.models import IndexAttemptSnapshot


class CCPairFullInfo(BaseModel):
    id: int
    name: str
    new_docs_indexed: int
    connector: ConnectorSnapshot
    credential: CredentialSnapshot
    index_attempts: list[IndexAttemptSnapshot]
    latest_deletion_attempt: DeletionAttemptSnapshot | None

    @classmethod
    def from_models(
        cls,
        cc_pair_model: ConnectorCredentialPair,
        index_attempt_models: list[IndexAttempt],
        latest_deletion_attempt: DeletionAttemptSnapshot | None,
        new_docs_indexed: int,  # not ideal, but this must be computed seperately
    ) -> "CCPairFullInfo":
        return cls(
            id=cc_pair_model.id,
            name=cc_pair_model.name,
            new_docs_indexed=new_docs_indexed,
            connector=ConnectorSnapshot.from_connector_db_model(
                cc_pair_model.connector
            ),
            credential=CredentialSnapshot.from_credential_db_model(
                cc_pair_model.credential
            ),
            index_attempts=[
                IndexAttemptSnapshot.from_index_attempt_db_model(index_attempt_model)
                for index_attempt_model in index_attempt_models
            ],
            latest_deletion_attempt=latest_deletion_attempt,
        )
