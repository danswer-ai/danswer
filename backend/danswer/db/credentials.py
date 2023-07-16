from typing import Any

from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.models import Credential
from danswer.db.models import User
from danswer.server.models import CredentialBase
from danswer.server.models import ObjectCreationIdResponse
from danswer.utils.logger import setup_logger
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import or_


logger = setup_logger()


def mask_string(sensitive_str: str) -> str:
    return "****...**" + sensitive_str[-4:]


def mask_credential_dict(credential_dict: dict[str, Any]) -> dict[str, str]:
    masked_creds = {}
    for key, val in credential_dict.items():
        if not isinstance(val, str):
            raise ValueError(
                "Unable to mask credentials of type other than string, cannot process request."
            )

        masked_creds[key] = mask_string(val)
    return masked_creds


def fetch_credentials(
    user: User | None,
    db_session: Session,
) -> list[Credential]:
    stmt = select(Credential)
    if user:
        stmt = stmt.where(
            or_(Credential.user_id == user.id, Credential.user_id.is_(None))
        )
    results = db_session.scalars(stmt)
    return list(results.all())


def fetch_credential_by_id(
    credential_id: int, user: User | None, db_session: Session
) -> Credential | None:
    stmt = select(Credential).where(Credential.id == credential_id)
    if user:
        stmt = stmt.where(
            or_(Credential.user_id == user.id, Credential.user_id.is_(None))
        )
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
        user_id=user.id if user else None,
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
    credential.user_id = user.id if user is not None else None
    credential.public_doc = credential_data.public_doc

    db_session.commit()
    return credential


def update_credential_json(
    credential_id: int,
    credential_json: dict[str, Any],
    user: User,
    db_session: Session,
) -> Credential | None:
    credential = fetch_credential_by_id(credential_id, user, db_session)
    if credential is None:
        return None
    credential.credential_json = credential_json

    db_session.commit()
    return credential


def backend_update_credential_json(
    credential: Credential,
    credential_json: dict[str, Any],
    db_session: Session,
) -> None:
    """This should not be used in any flows involving the frontend or users"""
    credential.credential_json = credential_json
    db_session.commit()


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


def create_initial_public_credential() -> None:
    public_cred_id = 0
    error_msg = (
        "DB is not in a valid initial state."
        "There must exist an empty public credential for data connectors that do not require additional Auth."
    )
    with Session(get_sqlalchemy_engine(), expire_on_commit=False) as db_session:
        first_credential = fetch_credential_by_id(public_cred_id, None, db_session)

        if first_credential is not None:
            if (
                first_credential.credential_json != {}
                or first_credential.public_doc is False
            ):
                raise ValueError(error_msg)
            return

        credential = Credential(
            id=public_cred_id, credential_json={}, user_id=None, public_doc=True
        )
        db_session.add(credential)
        db_session.commit()
