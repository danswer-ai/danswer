from danswer.configs.constants import DocumentSource
from danswer.connectors.models import InputType
from danswer.db.engine import build_engine
from danswer.db.models import Connector
from danswer.server.models import ConnectorSnapshot
from danswer.utils.logging import setup_logger
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

logger = setup_logger()


def fetch_connectors(
    *,
    sources: list[DocumentSource] | None = None,
    input_types: list[InputType] | None = None,
    disabled_status: bool | None = None,
) -> list[Connector]:
    with Session(build_engine(), future=True, expire_on_commit=False) as session:
        stmt = select(Connector)
        if sources:
            stmt = stmt.where(Connector.source.in_(sources))
        if input_types:
            stmt = stmt.where(Connector.input_type.in_(input_types))
        if disabled_status:
            stmt = stmt.where(Connector.disabled.is_(disabled_status))
        results = session.scalars(stmt)
        return list(results.all())


def fetch_connector_by_id(connector_id: int) -> Connector:
    with Session(build_engine(), future=True, expire_on_commit=False) as session:
        stmt = select(Connector).where(Connector.id == connector_id)
        result = session.execute(stmt)
        connector = result.scalar_one()
        return connector


def create_update_connector(
    connector_id: int, connector_data: ConnectorSnapshot
) -> Connector:
    if connector_id != connector_data.id:
        raise ValueError("Conflicting information in trying to update Connector")
    with Session(build_engine(), future=True, expire_on_commit=False) as session:
        try:
            connector = fetch_connector_by_id(connector_id=connector_id)
        except NoResultFound:
            connector = Connector(id=connector_id)
            session.add(connector)

        connector.name = connector_data.name
        connector.source = connector_data.source
        connector.input_type = connector_data.input_type
        connector.connector_specific_config = connector_data.connector_specific_config
        connector.refresh_freq = connector_data.refresh_freq
        connector.disabled = connector_data.disabled

        session.commit()
    return connector
