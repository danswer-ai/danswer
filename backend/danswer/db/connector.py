from typing import cast

from fastapi import HTTPException
from sqlalchemy import and_
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import aliased
from sqlalchemy.orm import Session

from danswer.configs.constants import DocumentSource
from danswer.connectors.models import InputType
from danswer.db.models import Connector
from danswer.db.models import IndexAttempt
from danswer.server.models import ConnectorBase
from danswer.server.models import ObjectCreationIdResponse
from danswer.server.models import StatusResponse
from danswer.utils.logger import setup_logger

logger = setup_logger()


def fetch_connectors(
    db_session: Session,
    sources: list[DocumentSource] | None = None,
    input_types: list[InputType] | None = None,
    disabled_status: bool | None = None,
) -> list[Connector]:
    stmt = select(Connector)
    if sources is not None:
        stmt = stmt.where(Connector.source.in_(sources))
    if input_types is not None:
        stmt = stmt.where(Connector.input_type.in_(input_types))
    if disabled_status is not None:
        stmt = stmt.where(Connector.disabled == disabled_status)
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
        disabled=connector_data.disabled,
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


def disable_connector(
    connector_id: int,
    db_session: Session,
) -> StatusResponse[int]:
    connector = fetch_connector_by_id(connector_id, db_session)
    if connector is None:
        raise HTTPException(status_code=404, detail="Connector does not exist")

    connector.disabled = True
    db_session.commit()
    return StatusResponse(
        success=True, message="Connector deleted successfully", data=connector_id
    )


def delete_connector(
    connector_id: int,
    db_session: Session,
) -> StatusResponse[int]:
    """Currently unused due to foreign key restriction from IndexAttempt
    Use disable_connector instead"""
    connector = fetch_connector_by_id(connector_id, db_session)
    if connector is None:
        return StatusResponse(
            success=True, message="Connector was already deleted", data=connector_id
        )

    db_session.delete(connector)
    return StatusResponse(
        success=True, message="Connector deleted successfully", data=connector_id
    )


def get_connector_credential_ids(
    connector_id: int,
    db_session: Session,
) -> list[int]:
    connector = fetch_connector_by_id(connector_id, db_session)
    if connector is None:
        raise ValueError(f"Connector by id {connector_id} does not exist")

    return [association.credential.id for association in connector.credentials]


def fetch_latest_index_attempt_by_connector(
    db_session: Session,
    source: DocumentSource | None = None,
) -> list[IndexAttempt]:
    latest_index_attempts: list[IndexAttempt] = []

    if source:
        connectors = fetch_connectors(
            db_session, sources=[source], disabled_status=False
        )
    else:
        connectors = fetch_connectors(db_session, disabled_status=False)

    if not connectors:
        return []

    for connector in connectors:
        latest_index_attempt = (
            db_session.query(IndexAttempt)
            .filter(IndexAttempt.connector_id == connector.id)
            .order_by(IndexAttempt.time_updated.desc())
            .first()
        )

        if latest_index_attempt is not None:
            latest_index_attempts.append(latest_index_attempt)

    return latest_index_attempts


def fetch_latest_index_attempts_by_status(
    db_session: Session,
) -> list[IndexAttempt]:
    subquery = (
        db_session.query(
            IndexAttempt.connector_id,
            IndexAttempt.credential_id,
            IndexAttempt.status,
            func.max(IndexAttempt.time_updated).label("time_updated"),
        )
        .group_by(IndexAttempt.connector_id)
        .group_by(IndexAttempt.credential_id)
        .group_by(IndexAttempt.status)
        .subquery()
    )

    alias = aliased(IndexAttempt, subquery)

    query = db_session.query(IndexAttempt).join(
        alias,
        and_(
            IndexAttempt.connector_id == alias.connector_id,
            IndexAttempt.credential_id == alias.credential_id,
            IndexAttempt.status == alias.status,
            IndexAttempt.time_updated == alias.time_updated,
        ),
    )
    return cast(list[IndexAttempt], query.all())
