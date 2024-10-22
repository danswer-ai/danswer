from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import delete
from sqlalchemy import desc
from sqlalchemy import exists
from sqlalchemy import Select
from sqlalchemy import select
from sqlalchemy.orm import aliased
from sqlalchemy.orm import Session

from ee.enmedd.db.external_perm import delete_user__ext_teamspace_for_cc_pair__no_commit
from ee.enmedd.external_permissions.sync_params import check_if_valid_sync_source
from enmedd.configs.constants import DocumentSource
from enmedd.db.connector import fetch_connector_by_id
from enmedd.db.credentials import fetch_credential_by_id
from enmedd.db.enums import AccessType
from enmedd.db.enums import ConnectorCredentialPairStatus
from enmedd.db.models import ConnectorCredentialPair
from enmedd.db.models import IndexAttempt
from enmedd.db.models import IndexingStatus
from enmedd.db.models import IndexModelStatus
from enmedd.db.models import SearchSettings
from enmedd.db.models import Teamspace__ConnectorCredentialPair
from enmedd.db.models import User
from enmedd.db.models import User__Teamspace
from enmedd.db.models import UserRole
from enmedd.server.models import StatusResponse
from enmedd.utils.logger import setup_logger

logger = setup_logger()


def _add_user_filters(
    stmt: Select, user: User | None, get_editable: bool = True
) -> Select:
    # If user is None, assume the user is an admin or auth is disabled
    if user is None or user.role == UserRole.ADMIN:
        return stmt

    Teams_CCPair = aliased(Teamspace__ConnectorCredentialPair)
    User_Teams = aliased(User__Teamspace)

    """
    Here we select cc_pairs by relation:
    User -> User__Teamspace -> Teamspace__ConnectorCredentialPair ->
    ConnectorCredentialPair
    """
    stmt = stmt.outerjoin(Teams_CCPair).outerjoin(
        User_Teams,
        User_Teams.teamspace_id == Teams_CCPair.teamspace_id,
    )

    """
    Filter cc_pairs by:
    - if the user is in the teamspace that owns the cc_pair
    - if editing is being done, we also filter out cc_pairs that are owned by groups
    the user isn't part of
    - if we are not editing, we show all public cc_pairs
    """
    where_clause = User_Teams.user_id == user.id

    if get_editable:
        teamspaces = select(User_Teams.teamspace_id).where(
            User_Teams.user_id == user.id
        )
        where_clause &= (
            ~exists()
            .where(Teams_CCPair.cc_pair_id == ConnectorCredentialPair.id)
            .where(~Teams_CCPair.teamspace_id.in_(teamspaces))
            .correlate(ConnectorCredentialPair)
        )
    else:
        where_clause |= ConnectorCredentialPair.access_type == AccessType.PUBLIC

    return stmt.where(where_clause)


def get_connector_credential_pairs(
    db_session: Session,
    include_disabled: bool = True,
    user: User | None = None,
    get_editable: bool = True,
    ids: list[int] | None = None,
) -> list[ConnectorCredentialPair]:
    stmt = select(ConnectorCredentialPair).distinct()
    stmt = _add_user_filters(stmt, user, get_editable)
    if not include_disabled:
        stmt = stmt.where(
            ConnectorCredentialPair.status == ConnectorCredentialPairStatus.ACTIVE
        )  # noqa
    if ids:
        stmt = stmt.where(ConnectorCredentialPair.id.in_(ids))
    return list(db_session.scalars(stmt).all())


def add_deletion_failure_message(
    db_session: Session,
    cc_pair_id: int,
    failure_message: str,
) -> None:
    cc_pair = get_connector_credential_pair_from_id(cc_pair_id, db_session)
    if not cc_pair:
        return
    cc_pair.deletion_failure_message = failure_message
    db_session.commit()


def get_cc_pair_groups_for_ids(
    db_session: Session,
    cc_pair_ids: list[int],
    user: User | None = None,
    get_editable: bool = True,
) -> list[Teamspace__ConnectorCredentialPair]:
    stmt = select(Teamspace__ConnectorCredentialPair).distinct()
    stmt = stmt.outerjoin(
        ConnectorCredentialPair,
        Teamspace__ConnectorCredentialPair.cc_pair_id == ConnectorCredentialPair.id,
    )
    stmt = _add_user_filters(stmt, user, get_editable)
    stmt = stmt.where(Teamspace__ConnectorCredentialPair.cc_pair_id.in_(cc_pair_ids))
    return list(db_session.scalars(stmt).all())


def get_connector_credential_pair(
    connector_id: int,
    credential_id: int,
    db_session: Session,
    user: User | None = None,
    get_editable: bool = True,
) -> ConnectorCredentialPair | None:
    stmt = select(ConnectorCredentialPair)
    stmt = _add_user_filters(stmt, user, get_editable)
    stmt = stmt.where(ConnectorCredentialPair.connector_id == connector_id)
    stmt = stmt.where(ConnectorCredentialPair.credential_id == credential_id)
    result = db_session.execute(stmt)
    return result.scalar_one_or_none()


def get_connector_credential_source_from_id(
    cc_pair_id: int,
    db_session: Session,
    user: User | None = None,
    get_editable: bool = True,
) -> DocumentSource | None:
    stmt = select(ConnectorCredentialPair)
    stmt = _add_user_filters(stmt, user, get_editable)
    stmt = stmt.where(ConnectorCredentialPair.id == cc_pair_id)
    result = db_session.execute(stmt)
    cc_pair = result.scalar_one_or_none()
    return cc_pair.connector.source if cc_pair else None


def get_connector_credential_pair_from_id(
    cc_pair_id: int,
    db_session: Session,
    user: User | None = None,
    get_editable: bool = True,
) -> ConnectorCredentialPair | None:
    stmt = select(ConnectorCredentialPair).distinct()
    stmt = _add_user_filters(stmt, user, get_editable)
    stmt = stmt.where(ConnectorCredentialPair.id == cc_pair_id)
    result = db_session.execute(stmt)
    return result.scalar_one_or_none()


def get_last_successful_attempt_time(
    connector_id: int,
    credential_id: int,
    earliest_index: float,
    search_settings: SearchSettings,
    db_session: Session,
) -> float:
    """Gets the timestamp of the last successful index run stored in
    the CC Pair row in the database"""
    if search_settings.status == IndexModelStatus.PRESENT:
        connector_credential_pair = get_connector_credential_pair(
            connector_id, credential_id, db_session
        )
        if (
            connector_credential_pair is None
            or connector_credential_pair.last_successful_index_time is None
        ):
            return earliest_index

        return connector_credential_pair.last_successful_index_time.timestamp()

    # For Secondary Index we don't keep track of the latest success, so have to calculate it live
    attempt = (
        db_session.query(IndexAttempt)
        .join(
            ConnectorCredentialPair,
            IndexAttempt.connector_credential_pair_id == ConnectorCredentialPair.id,
        )
        .filter(
            ConnectorCredentialPair.connector_id == connector_id,
            ConnectorCredentialPair.credential_id == credential_id,
            IndexAttempt.search_settings_id == search_settings.id,
            IndexAttempt.status == IndexingStatus.SUCCESS,
        )
        .order_by(IndexAttempt.time_started.desc())
        .first()
    )

    if not attempt or not attempt.time_started:
        return earliest_index

    return attempt.time_started.timestamp()


"""Updates"""


def _update_connector_credential_pair(
    db_session: Session,
    cc_pair: ConnectorCredentialPair,
    status: ConnectorCredentialPairStatus | None = None,
    net_docs: int | None = None,
    run_dt: datetime | None = None,
) -> None:
    # simply don't update last_successful_index_time if run_dt is not specified
    # at worst, this would result in re-indexing documents that were already indexed
    if run_dt is not None:
        cc_pair.last_successful_index_time = run_dt
    if net_docs is not None:
        cc_pair.total_docs_indexed += net_docs
    if status is not None:
        cc_pair.status = status
    db_session.commit()


def update_connector_credential_pair_from_id(
    db_session: Session,
    cc_pair_id: int,
    status: ConnectorCredentialPairStatus | None = None,
    net_docs: int | None = None,
    run_dt: datetime | None = None,
) -> None:
    cc_pair = get_connector_credential_pair_from_id(cc_pair_id, db_session)
    if not cc_pair:
        logger.warning(
            f"Attempted to update pair for Connector Credential Pair '{cc_pair_id}'"
            f" but it does not exist"
        )
        return

    _update_connector_credential_pair(
        db_session=db_session,
        cc_pair=cc_pair,
        status=status,
        net_docs=net_docs,
        run_dt=run_dt,
    )


def update_connector_credential_pair(
    db_session: Session,
    connector_id: int,
    credential_id: int,
    status: ConnectorCredentialPairStatus | None = None,
    net_docs: int | None = None,
    run_dt: datetime | None = None,
) -> None:
    cc_pair = get_connector_credential_pair(connector_id, credential_id, db_session)
    if not cc_pair:
        logger.warning(
            f"Attempted to update pair for connector id {connector_id} "
            f"and credential id {credential_id}"
        )
        return

    _update_connector_credential_pair(
        db_session=db_session,
        cc_pair=cc_pair,
        status=status,
        net_docs=net_docs,
        run_dt=run_dt,
    )


def delete_connector_credential_pair__no_commit(
    db_session: Session,
    connector_id: int,
    credential_id: int,
) -> None:
    stmt = delete(ConnectorCredentialPair).where(
        ConnectorCredentialPair.connector_id == connector_id,
        ConnectorCredentialPair.credential_id == credential_id,
    )
    db_session.execute(stmt)


def associate_default_cc_pair(db_session: Session) -> None:
    existing_association = (
        db_session.query(ConnectorCredentialPair)
        .filter(
            ConnectorCredentialPair.connector_id == 0,
            ConnectorCredentialPair.credential_id == 0,
        )
        .one_or_none()
    )
    if existing_association is not None:
        return

    association = ConnectorCredentialPair(
        connector_id=0,
        credential_id=0,
        access_type=AccessType.PUBLIC,
        name="DefaultCCPair",
        status=ConnectorCredentialPairStatus.ACTIVE,
    )
    db_session.add(association)
    db_session.commit()


def _relate_groups_to_cc_pair__no_commit(
    db_session: Session,
    cc_pair_id: int,
    teamspace_ids: list[int],
) -> None:
    for group_id in teamspace_ids:
        db_session.add(
            Teamspace__ConnectorCredentialPair(
                teamspace_id=group_id, cc_pair_id=cc_pair_id
            )
        )


def add_credential_to_connector(
    db_session: Session,
    user: User | None,
    connector_id: int,
    credential_id: int,
    cc_pair_name: str | None,
    access_type: AccessType,
    groups: list[int] | None,
    auto_sync_options: dict | None = None,
) -> StatusResponse:
    connector = fetch_connector_by_id(connector_id, db_session)
    credential = fetch_credential_by_id(credential_id, user, db_session)

    if connector is None:
        raise HTTPException(status_code=404, detail="Connector does not exist")

    if access_type == AccessType.SYNC:
        if not check_if_valid_sync_source(connector.source):
            raise HTTPException(
                status_code=400,
                detail=f"Connector of type {connector.source} does not support SYNC access type",
            )

    if credential is None:
        error_msg = (
            f"Credential {credential_id} does not exist or does not belong to user"
        )
        logger.error(error_msg)
        raise HTTPException(
            status_code=401,
            detail=error_msg,
        )

    existing_association = (
        db_session.query(ConnectorCredentialPair)
        .filter(
            ConnectorCredentialPair.connector_id == connector_id,
            ConnectorCredentialPair.credential_id == credential_id,
        )
        .one_or_none()
    )
    if existing_association is not None:
        return StatusResponse(
            success=False,
            message=f"Connector {connector_id} already has Credential {credential_id}",
            data=connector_id,
        )

    association = ConnectorCredentialPair(
        connector_id=connector_id,
        credential_id=credential_id,
        name=cc_pair_name,
        status=ConnectorCredentialPairStatus.ACTIVE,
        access_type=access_type,
        auto_sync_options=auto_sync_options,
    )
    db_session.add(association)
    db_session.flush()  # make sure the association has an id

    if groups and access_type != AccessType.SYNC:
        _relate_groups_to_cc_pair__no_commit(
            db_session=db_session,
            cc_pair_id=association.id,
            teamspace_ids=groups,
        )

    db_session.commit()

    return StatusResponse(
        success=True,
        message=f"Creating new association between Connector {connector_id} and Credential {credential_id}",
        data=association.id,
    )


def remove_credential_from_connector(
    connector_id: int,
    credential_id: int,
    user: User | None,
    db_session: Session,
) -> StatusResponse[int]:
    connector = fetch_connector_by_id(connector_id, db_session)
    credential = fetch_credential_by_id(credential_id, user, db_session)

    if connector is None:
        raise HTTPException(status_code=404, detail="Connector does not exist")

    if credential is None:
        raise HTTPException(
            status_code=404,
            detail="Credential does not exist or does not belong to user",
        )

    association = get_connector_credential_pair(
        connector_id=connector_id,
        credential_id=credential_id,
        db_session=db_session,
        user=user,
        get_editable=True,
    )

    if association is not None:
        delete_user__ext_teamspace_for_cc_pair__no_commit(
            db_session=db_session,
            cc_pair_id=association.id,
        )
        db_session.delete(association)
        db_session.commit()
        return StatusResponse(
            success=True,
            message=f"Credential {credential_id} removed from Connector",
            data=connector_id,
        )

    return StatusResponse(
        success=False,
        message=f"Connector already does not have Credential {credential_id}",
        data=connector_id,
    )


def fetch_connector_credential_pairs(
    db_session: Session,
) -> list[ConnectorCredentialPair]:
    return db_session.query(ConnectorCredentialPair).all()


def resync_cc_pair(
    cc_pair: ConnectorCredentialPair,
    db_session: Session,
) -> None:
    def find_latest_index_attempt(
        connector_id: int,
        credential_id: int,
        only_include_success: bool,
        db_session: Session,
    ) -> IndexAttempt | None:
        query = (
            db_session.query(IndexAttempt)
            .join(
                ConnectorCredentialPair,
                IndexAttempt.connector_credential_pair_id == ConnectorCredentialPair.id,
            )
            .join(SearchSettings, IndexAttempt.search_settings_id == SearchSettings.id)
            .filter(
                ConnectorCredentialPair.connector_id == connector_id,
                ConnectorCredentialPair.credential_id == credential_id,
                SearchSettings.status == IndexModelStatus.PRESENT,
            )
        )

        if only_include_success:
            query = query.filter(IndexAttempt.status == IndexingStatus.SUCCESS)

        latest_index_attempt = query.order_by(desc(IndexAttempt.time_started)).first()

        return latest_index_attempt

    last_success = find_latest_index_attempt(
        connector_id=cc_pair.connector_id,
        credential_id=cc_pair.credential_id,
        only_include_success=True,
        db_session=db_session,
    )

    cc_pair.last_successful_index_time = (
        last_success.time_started if last_success else None
    )

    db_session.commit()
