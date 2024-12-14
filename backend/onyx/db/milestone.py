from sqlalchemy import select
from sqlalchemy.orm import Session

from onyx.configs.constants import MilestoneRecordType
from onyx.db.models import Milestone
from onyx.db.models import User


def create_milestone(
    user: User | None,
    tenant_id: str | None,
    event_type: MilestoneRecordType,
    db_session: Session,
) -> Milestone:
    milestone = Milestone(
        event_type=event_type,
        user_id=user.id if user else None,
        tenant_id=tenant_id,
    )
    db_session.add(milestone)
    db_session.commit()

    return milestone


def create_milestone_if_not_exists(
    user: User | None,
    tenant_id: str | None,
    event_type: MilestoneRecordType,
    db_session: Session,
) -> tuple[Milestone, bool]:
    """
    Create a milestone if it doesn't already exist.
    Returns the milestone and a boolean indicating if it was created.
    """
    # Every milestone should only happen once per deployment/tenant
    stmt = select(Milestone).where(
        Milestone.event_type == event_type,
        Milestone.tenant_id == tenant_id,
    )
    result = db_session.execute(stmt)
    milestones = result.scalars().all()

    if len(milestones) > 1:
        raise ValueError(
            f"Multiple {event_type} milestones found for tenant {tenant_id}"
        )

    if not milestones:
        return create_milestone(user, tenant_id, event_type, db_session), True

    return milestones[0], False
