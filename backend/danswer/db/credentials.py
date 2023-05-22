from danswer.configs.constants import DocumentSource
from danswer.connectors.models import InputType
from danswer.db.engine import build_engine
from danswer.db.models import Credential
from danswer.server.models import CredentialSnapshot
from danswer.utils.logging import setup_logger
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

logger = setup_logger()


def fetch_credentials(
    *,
    user_id: int | None = None,
) -> list[Credential]:
    with Session(build_engine(), future=True, expire_on_commit=False) as session:
        stmt = select(Credential)
        if user_id:
            stmt = stmt.where(Credential.user_id.is_(user_id))
        results = session.scalars(stmt)
        return list(results.all())


def fetch_credential_by_id(credential_id: int) -> Credential:
    with Session(build_engine(), future=True, expire_on_commit=False) as session:
        stmt = select(Credential).where(Credential.id == credential_id)
        result = session.execute(stmt)
        credential = result.scalar_one()
        return credential


def create_update_credential(
    credential_id: int, credential_data: CredentialSnapshot
) -> Credential:
    if credential_id != credential_data.id:
        raise ValueError("Conflicting information in trying to update Credential")
    pass
