from danswer.db.models import Credential
from danswer.db.models import User
from danswer.server.models import CredentialBase
from danswer.server.models import ObjectCreationIdResponse
from danswer.server.models import StatusResponse
from danswer.utils.logging import setup_logger
from sqlalchemy import select
from sqlalchemy.orm import Session

logger = setup_logger()


def credential_not_found_response(credential_id: int) -> StatusResponse[int]:
    return StatusResponse(
        success=False,
        message="Credential does not exit or does not belong to user",
        data=credential_id,
    )


def fetch_credentials(
    user: User | None,
    db_session: Session,
) -> list[Credential]:
    stmt = select(Credential)
    if user:
        stmt = stmt.where(Credential.user_id.is_(user.id))
    results = db_session.scalars(stmt)
    return list(results.all())


def fetch_credential_by_id(
    credential_id: int, user: User | None, db_session: Session
) -> Credential | None:
    stmt = select(Credential).where(Credential.id == credential_id)
    if user:
        stmt = stmt.where(Credential.user_id.is_(user.id))
    result = db_session.execute(stmt)
    credential = result.scalar_one_or_none()
    return credential


def create_credential(
    credential_data: CredentialBase,
    user: User,
    db_session: Session,
) -> ObjectCreationIdResponse:
    credential = Credential(
        credential_json=credential_data.credential_json,
        user_id=int(user.id) if user else None,
        public_doc=credential_data.public_doc,
    )
    db_session.add(credential)
    db_session.commit()

    return ObjectCreationIdResponse(id=credential.id)


def update_credential(
    credential_id: int,
    credential_data: CredentialBase,
    user: User,
    db_session: Session,
) -> Credential | None:
    credential = fetch_credential_by_id(credential_id, user, db_session)
    if credential is None:
        return None

    credential.credential_json = credential_data.credential_json
    credential.user_id = int(user.id) if user is not None else None
    credential.public_doc = credential_data.public_doc

    db_session.commit()
    return credential


def delete_credential(
    credential_id: int,
    user: User,
    db_session: Session,
) -> None:
    credential = fetch_credential_by_id(credential_id, user, db_session)
    if credential is None:
        raise ValueError(
            f"Credential by provided id {credential_id} does not exist or does not belong to user"
        )

    db_session.delete(credential)
    db_session.commit()
