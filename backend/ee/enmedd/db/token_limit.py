from collections.abc import Sequence

from sqlalchemy import Row
from sqlalchemy import select
from sqlalchemy.orm import Session

from enmedd.configs.constants import TokenRateLimitScope
from enmedd.db.models import TokenRateLimit
from enmedd.db.models import TokenRateLimit__Teamspace
from enmedd.db.models import Teamspace
from enmedd.server.token_rate_limits.models import TokenRateLimitArgs


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


def fetch_all_teamspace_token_rate_limits(
    db_session: Session, team_id: int, enabled_only: bool = False, ordered: bool = True
) -> Sequence[TokenRateLimit]:
    query = (
        select(TokenRateLimit)
        .join(
            TokenRateLimit__Teamspace,
            TokenRateLimit.id == TokenRateLimit__Teamspace.rate_limit_id,
        )
        .where(
            TokenRateLimit__Teamspace.teamspace_id == team_id,
            TokenRateLimit.scope == TokenRateLimitScope.TEAMSPACE,
        )
    )

    if enabled_only:
        query = query.where(TokenRateLimit.enabled.is_(True))

    if ordered:
        query = query.order_by(TokenRateLimit.created_at.desc())

    token_rate_limits = db_session.scalars(query).all()
    return token_rate_limits


def fetch_all_teamspace_token_rate_limits_by_group(
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
