from uuid import UUID

from sqlalchemy import inspect
from sqlalchemy import select
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ee.enmedd.server.workspace.models import WorkspaceCreate
from enmedd.auth.schemas import UserRole
from enmedd.db.enums import InstanceSubscriptionPlan
from enmedd.db.models import Instance
from enmedd.db.models import User
from enmedd.db.models import Workspace__Users


def create_new_schema(db_session: Session, schema_name: str) -> None:
    """Create a new schema in the database."""
    db_session.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}"))
    db_session.commit()


def fetch_all_schemas(db_session: Session):
    """Fetch all schemas from the database."""
    result = db_session.execute(
        text(
            "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog')"
        )
    ).fetchall()

    schemas = [row[0] for row in result]
    return schemas


def migrate_public_schema_to_new_schema(db_session: Session, schema_name: str) -> None:
    """Migrate the table structures from the public schema to a new schema."""

    db_session.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name};"))

    inspector = inspect(db_session.bind)
    public_tables = inspector.get_table_names(schema="public")

    for table_name in public_tables:
        db_session.execute(
            text(
                f"""
            CREATE TABLE IF NOT EXISTS {schema_name}.{table_name}
            (LIKE public.{table_name} INCLUDING ALL);
        """
            )
        )

    db_session.commit()


def delete_schema(db_session: Session, schema_name: str) -> None:
    """Delete the schema from the database."""
    db_session.execute(text(f"DROP SCHEMA IF EXISTS {schema_name} CASCADE"))
    db_session.commit()


def insert_workspace_data(
    db_session: Session, schema_name: str, workspace: WorkspaceCreate
) -> int:
    """Insert workspace data into the new schema's workspace table and return workspace_id."""
    result = db_session.execute(
        text(
            f"""
            INSERT INTO {schema_name}.workspace (
                instance_id, workspace_name, workspace_description, use_custom_logo,
                custom_logo, custom_header_logo, custom_header_content,
                brand_color, secondary_color
            ) VALUES (
                :instance_id, :workspace_name, :workspace_description, :use_custom_logo,
                :custom_logo, :custom_header_logo, :custom_header_content,
                :brand_color, :secondary_color
            )
            RETURNING id  -- Assuming `id` is the primary key column for the workspace table
        """
        ),
        {
            "instance_id": 0,  # Adjust as needed
            "workspace_name": workspace.workspace_name,
            "workspace_description": workspace.workspace_description,
            "use_custom_logo": workspace.use_custom_logo,
            "custom_logo": workspace.custom_logo,
            "custom_header_logo": workspace.custom_header_logo,
            "custom_header_content": workspace.custom_header_content,
            "brand_color": workspace.brand_color,
            "secondary_color": workspace.secondary_color,
        },
    )
    workspace_id = result.scalar()
    db_session.commit()
    return workspace_id


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
