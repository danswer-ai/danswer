from danswer.configs.constants import DocumentSource
from danswer.connectors.models import InputType
from danswer.db.credentials import fetch_credential_by_id
from danswer.db.models import Connector
from danswer.db.models import ConnectorCredentialAssociation
from danswer.db.models import User
from danswer.server.models import ConnectorBase
from danswer.server.models import ObjectCreationIdResponse
from danswer.server.models import StatusResponse
from danswer.utils.logging import setup_logger
from sqlalchemy import select
from sqlalchemy.orm import Session

logger = setup_logger()


def connector_not_found_response(connector_id: int) -> StatusResponse[int]:
    return StatusResponse(
        success=False, message=f"Connector does not exist", data=connector_id
    )


def fetch_connectors(
    db_session: Session,
    sources: list[DocumentSource] | None = None,
    input_types: list[InputType] | None = None,
    disabled_status: bool | None = None,
) -> list[Connector]:
    stmt = select(Connector)
    if sources:
        stmt = stmt.where(Connector.source.in_(sources))
    if input_types:
        stmt = stmt.where(Connector.input_type.in_(input_types))
    if disabled_status:
        stmt = stmt.where(Connector.disabled.is_(disabled_status))
    results = db_session.scalars(stmt)
    return list(results.all())


def connector_by_name_exists(connector_name: str, db_session: Session) -> bool:
    stmt = select(Connector).where(Connector.name == connector_name)
    result = db_session.execute(stmt)
    connector = result.scalar_one_or_none()
    return connector is not None


def fetch_connector_by_id(connector_id: int, db_session: Session) -> Connector | None:
    stmt = select(Connector).where(Connector.id == connector_id)
    result = db_session.execute(stmt)
    connector = result.scalar_one_or_none()
    return connector


def create_connector(
    connector_data: ConnectorBase,
    db_session: Session,
) -> ObjectCreationIdResponse:
    if connector_by_name_exists(connector_data.name, db_session):
        raise ValueError(
            "Connector by this name already exists, duplicate naming not allowed."
        )

    connector = Connector(
        name=connector_data.name,
        source=connector_data.source,
        input_type=connector_data.input_type,
        connector_specific_config=connector_data.connector_specific_config,
        refresh_freq=connector_data.refresh_freq,
    )
    db_session.add(connector)
    db_session.commit()

    return ObjectCreationIdResponse(id=connector.id)


def update_connector(
    connector_id: int,
    connector_data: ConnectorBase,
    db_session: Session,
) -> Connector | None:
    connector = fetch_connector_by_id(connector_id, db_session)
    if connector is None:
        return None

    if connector_data.name != connector.name and connector_by_name_exists(
        connector_data.name, db_session
    ):
        raise ValueError(
            "Connector by this name already exists, duplicate naming not allowed."
        )

    connector.name = connector_data.name
    connector.source = connector_data.source
    connector.input_type = connector_data.input_type
    connector.connector_specific_config = connector_data.connector_specific_config
    connector.refresh_freq = connector_data.refresh_freq
    connector.disabled = connector_data.disabled

    db_session.commit()
    return connector


def delete_connector(
    connector_id: int,
    db_session: Session,
) -> StatusResponse[int]:
    connector = fetch_connector_by_id(connector_id, db_session)
    if connector is None:
        return StatusResponse(
            success=True, message="Connector was already deleted", data=connector_id
        )

    db_session.delete(connector)
    db_session.commit()
    return StatusResponse(
        success=True, message="Connector deleted successfully", data=connector_id
    )


def add_credential_to_connector(
    connector_id: int,
    credential_id: int,
    user: User,
    db_session: Session,
) -> StatusResponse[int]:
    connector = fetch_connector_by_id(connector_id, db_session)
    credential = fetch_credential_by_id(credential_id, user, db_session)

    if connector is None:
        return StatusResponse(
            success=False, message=f"Connector does not exist", data=connector_id
        )

    if credential is None:
        return StatusResponse(
            success=False,
            message=f"Credential does not exist or does not belong to user",
            data=credential_id,
        )

    existing_association = (
        db_session.query(ConnectorCredentialAssociation)
        .filter(
            ConnectorCredentialAssociation.connector_id == connector_id,
            ConnectorCredentialAssociation.credential_id == credential_id,
        )
        .one_or_none()
    )
    if existing_association is not None:
        return StatusResponse(
            success=False,
            message=f"Connector already has Credential {credential_id}",
            data=connector_id,
        )

    association = ConnectorCredentialAssociation(
        connector_id=connector_id, credential_id=credential_id
    )
    db_session.add(association)
    db_session.commit()

    return StatusResponse(
        success=True,
        message=f"New Credential {credential_id} added to Connector",
        data=connector_id,
    )


def remove_credential_from_connector(
    connector_id: int,
    credential_id: int,
    user: User,
    db_session: Session,
) -> StatusResponse[int]:
    connector = fetch_connector_by_id(connector_id, db_session)
    credential = fetch_credential_by_id(credential_id, user, db_session)

    if connector is None:
        return StatusResponse(
            success=False, message=f"Connector does not exist", data=connector_id
        )

    if credential is None:
        return StatusResponse(
            success=False,
            message=f"Credential does not exist or does not belong to user",
            data=credential_id,
        )

    association = (
        db_session.query(ConnectorCredentialAssociation)
        .filter(
            ConnectorCredentialAssociation.connector_id == connector_id,
            ConnectorCredentialAssociation.credential_id == credential_id,
        )
        .one_or_none()
    )

    if association is not None:
        db_session.delete(association)
        db_session.commit()
        return StatusResponse(
            success=True,
            message=f"Credential {credential_id} removed from Connector",
            data=connector_id,
        )

    return StatusResponse(
        success=True,
        message=f"Connector already does not have Credential {credential_id}",
        data=connector_id,
    )
