from datetime import datetime

from danswer.db.models import Credential
from danswer.server.models import CredentialBase
from danswer.server.models import CredentialSnapshot
from danswer.server.models import ObjectCreationIdResponse
from danswer.utils.logging import setup_logger
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

logger = setup_logger()


def fetch_credentials(
    db_session: Session,
    user_id: int | None = None,
) -> list[Credential]:
    stmt = select(Credential)
    if user_id:
        stmt = stmt.where(Credential.user_id.is_(user_id))
    results = db_session.scalars(stmt)
    return list(results.all())


def fetch_credential_by_id(credential_id: int, db_session: Session) -> Credential:
    stmt = select(Credential).where(Credential.id == credential_id)
    result = db_session.execute(stmt)
    credential = result.scalar_one()
    return credential


def create_credential(
    credential_data: CredentialBase,
    db_session: Session,
) -> ObjectCreationIdResponse:
    pass


def update_credential(
    credential_id: int,
    credential_data: CredentialSnapshot,
    db_session: Session,
) -> Credential:
    if credential_id != credential_data.id:
        raise ValueError("Conflicting information in trying to update Credential")
    try:
        credential = fetch_credential_by_id(credential_id, db_session)
    except NoResultFound:
        credential = Credential(id=credential_id)
        db_session.add(credential)

    credential.credential_json = credential_data.credential_json
    credential.user_id = credential_data.user_id
    credential.public_doc = credential_data.public_doc
    credential.time_updated = datetime.now()

    db_session.commit()
    return credential
