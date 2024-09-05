from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from enmedd.auth.schemas import UserRole
from enmedd.db.enums import InstanceSubscriptionPlan
from enmedd.db.models import Instance
from enmedd.db.models import User
from enmedd.db.models import Workspace__Users


def upsert_instance(
    db_session: Session,
    id: int,
    instance_name: str,
    subscription_plan: InstanceSubscriptionPlan
    | None = InstanceSubscriptionPlan.ENTERPRISE,
    owner_id: UUID | None = None,
    commit: bool = True,
) -> Instance:
    try:
        # Check if the instance already exists
        instance = db_session.scalar(select(Instance).where(Instance.id == id))

        if instance:
            # Update existing instance
            instance.instance_name = instance_name
            instance.subscription_plan = subscription_plan
            instance.owner_id = owner_id
        else:
            # Create new instance
            instance = Instance(
                id=id,
                instance_name=instance_name,
                subscription_plan=subscription_plan,
                owner_id=owner_id,
            )
            db_session.add(instance)

        if commit:
            db_session.commit()
        else:
            # Flush the session so that the Prompt has an ID
            db_session.flush()

        return instance

    except SQLAlchemyError as e:
        # Roll back the changes in case of an error
        db_session.rollback()
        raise Exception(f"Error upserting instance: {str(e)}") from e


def get_workspace_by_id(
    instance_id: int, user: User | None = None, db_session: Session = None
) -> Instance | None:
    stmt = select(Instance).where(Instance.id == instance_id)

    if user and user.role == UserRole.BASIC:
        stmt = (
            stmt.where(Instance.workspaces)
            .join(Workspace__Users)
            .join(User)
            .where(User.id == user.id)
        )

    instance = db_session.scalar(stmt)
    return instance
