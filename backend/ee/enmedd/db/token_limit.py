from collections.abc import Sequence

from sqlalchemy import exists
from sqlalchemy import Row
from sqlalchemy import Select
from sqlalchemy import select
from sqlalchemy.orm import aliased
from sqlalchemy.orm import Session

from enmedd.configs.constants import TokenRateLimitScope
from enmedd.db.models import Teamspace
from enmedd.db.models import TokenRateLimit
from enmedd.db.models import TokenRateLimit__Teamspace
from enmedd.db.models import User
from enmedd.db.models import User__Teamspace
from enmedd.db.models import UserRole
from enmedd.server.token_rate_limits.models import TokenRateLimitArgs


def _add_user_filters(
    stmt: Select, user: User | None, get_editable: bool = True
) -> Select:
    # If user is None, assume the user is an admin or auth is disabled
    if user is None or user.role == UserRole.ADMIN:
        return stmt

    TRLimit_UG = aliased(TokenRateLimit__Teamspace)
    User__UG = aliased(User__Teamspace)

    """
    Here we select token_rate_limits by relation:
    User -> User__Teamspace -> TokenRateLimit__Teamspace ->
    TokenRateLimit
    """
    stmt = stmt.outerjoin(TRLimit_UG).outerjoin(
        User__UG,
        User__UG.teamspace_id == TRLimit_UG.teamspace_id,
    )

    """
    Filter token_rate_limits by:
    - if the user is in the teamspace that owns the token_rate_limit
    - if editing is being done, we also filter out token_rate_limits that are owned by groups
    that the user isn't associated with
    - if we are not editing, we show all token_rate_limits in the groups the user is associated with
    """
    where_clause = User__UG.user_id == user.id

    if get_editable:
        teamspaces = select(User__UG.teamspace_id).where(User__UG.user_id == user.id)

        where_clause &= (
            ~exists()
            .where(TRLimit_UG.rate_limit_id == TokenRateLimit.id)
            .where(~TRLimit_UG.teamspace_id.in_(teamspaces))
            .correlate(TokenRateLimit)
        )

    return stmt.where(where_clause)


def fetch_all_user_token_rate_limits(
    db_session: Session,
    enabled_only: bool = False,
    ordered: bool = True,
) -> Sequence[TokenRateLimit]:
    query = select(TokenRateLimit).where(
        TokenRateLimit.scope == TokenRateLimitScope.USER
    )

    if enabled_only:
        query = query.where(TokenRateLimit.enabled.is_(True))

    if ordered:
        query = query.order_by(TokenRateLimit.created_at.desc())

    return db_session.scalars(query).all()


def fetch_all_global_token_rate_limits(
    db_session: Session,
    enabled_only: bool = False,
    ordered: bool = True,
) -> Sequence[TokenRateLimit]:
    query = select(TokenRateLimit).where(
        TokenRateLimit.scope == TokenRateLimitScope.GLOBAL
    )

    if enabled_only:
        query = query.where(TokenRateLimit.enabled.is_(True))

    if ordered:
        query = query.order_by(TokenRateLimit.created_at.desc())

    token_rate_limits = db_session.scalars(query).all()
    return token_rate_limits


def fetch_teamspace_token_rate_limits(
    db_session: Session,
    group_id: int,
    user: User | None = None,
    enabled_only: bool = False,
    ordered: bool = True,
    get_editable: bool = True,
) -> Sequence[TokenRateLimit]:
    stmt = select(TokenRateLimit)
    stmt = stmt.where(User__Teamspace.teamspace_id == group_id)
    stmt = _add_user_filters(stmt, user, get_editable)

    if enabled_only:
        stmt = stmt.where(TokenRateLimit.enabled.is_(True))

    if ordered:
        stmt = stmt.order_by(TokenRateLimit.created_at.desc())

    return db_session.scalars(stmt).all()


def fetch_all_teamspace_token_rate_limits_by_teamspace(
    db_session: Session,
) -> Sequence[Row[tuple[TokenRateLimit, str]]]:
    query = (
        select(TokenRateLimit, Teamspace.name)
        .join(
            TokenRateLimit__Teamspace,
            TokenRateLimit.id == TokenRateLimit__Teamspace.rate_limit_id,
        )
        .join(Teamspace, Teamspace.id == TokenRateLimit__Teamspace.teamspace_id)
    )

    return db_session.execute(query).all()


def insert_user_token_rate_limit(
    db_session: Session,
    token_rate_limit_settings: TokenRateLimitArgs,
) -> TokenRateLimit:
    token_limit = TokenRateLimit(
        enabled=token_rate_limit_settings.enabled,
        token_budget=token_rate_limit_settings.token_budget,
        period_hours=token_rate_limit_settings.period_hours,
        scope=TokenRateLimitScope.USER,
    )
    db_session.add(token_limit)
    db_session.commit()

    return token_limit


def insert_global_token_rate_limit(
    db_session: Session,
    token_rate_limit_settings: TokenRateLimitArgs,
) -> TokenRateLimit:
    token_limit = TokenRateLimit(
        enabled=token_rate_limit_settings.enabled,
        token_budget=token_rate_limit_settings.token_budget,
        period_hours=token_rate_limit_settings.period_hours,
        scope=TokenRateLimitScope.GLOBAL,
    )
    db_session.add(token_limit)
    db_session.commit()

    return token_limit


def insert_teamspace_token_rate_limit(
    db_session: Session,
    token_rate_limit_settings: TokenRateLimitArgs,
    team_id: int,
) -> TokenRateLimit:
    token_limit = TokenRateLimit(
        enabled=token_rate_limit_settings.enabled,
        token_budget=token_rate_limit_settings.token_budget,
        period_hours=token_rate_limit_settings.period_hours,
        scope=TokenRateLimitScope.TEAMSPACE,
    )
    db_session.add(token_limit)
    db_session.flush()

    rate_limit = TokenRateLimit__Teamspace(
        rate_limit_id=token_limit.id, teamspace_id=team_id
    )
    db_session.add(rate_limit)
    db_session.commit()

    return token_limit


def update_token_rate_limit(
    db_session: Session,
    token_rate_limit_id: int,
    token_rate_limit_settings: TokenRateLimitArgs,
) -> TokenRateLimit:
    token_limit = db_session.get(TokenRateLimit, token_rate_limit_id)
    if token_limit is None:
        raise ValueError(f"TokenRateLimit with id '{token_rate_limit_id}' not found")

    token_limit.enabled = token_rate_limit_settings.enabled
    token_limit.token_budget = token_rate_limit_settings.token_budget
    token_limit.period_hours = token_rate_limit_settings.period_hours
    db_session.commit()

    return token_limit


def delete_token_rate_limit(
    db_session: Session,
    token_rate_limit_id: int,
) -> None:
    token_limit = db_session.get(TokenRateLimit, token_rate_limit_id)
    if token_limit is None:
        raise ValueError(f"TokenRateLimit with id '{token_rate_limit_id}' not found")

    db_session.query(TokenRateLimit__Teamspace).filter(
        TokenRateLimit__Teamspace.rate_limit_id == token_rate_limit_id
    ).delete()

    db_session.delete(token_limit)
    db_session.commit()
