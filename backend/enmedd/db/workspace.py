from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload
from sqlalchemy.orm import Session

from ee.enmedd.server.workspace.models import InstanceSubscriptionPlan
from ee.enmedd.server.workspace.models import WorkspaceCreate
from enmedd.auth.schemas import UserRole
from enmedd.db.models import Instance
from enmedd.db.models import User
from enmedd.db.models import Workspace
from enmedd.db.models import Workspace__Users


def _add_user__workspace_relationships__no_commit(
    db_session: Session, workspace_id: int, user_ids: list[UUID]
) -> list[Workspace__Users]:
    """NOTE: does not commit the transaction."""
    relationships = [
        Workspace__Users(user_id=user_id, workspace_id=workspace_id)
        for user_id in user_ids
    ]
    db_session.add_all(relationships)
    return relationships


def insert_workspace(
    db_session: Session, workspace: WorkspaceCreate, user_id: UUID
) -> Workspace:
    db_instance = Instance(
        instance_name=workspace.workspace_name,
        subscription_plan=InstanceSubscriptionPlan.PARTNER,  # You can modify this if needed
        owner_id=user_id,
    )
    db_session.add(db_instance)
    db_session.flush()  # flush to assign the instance an ID
    db_workspace = Workspace(
        instance_id=db_instance.id,
        workspace_name=workspace.workspace_name,
        workspace_description=workspace.workspace_description,
        use_custom_logo=workspace.use_custom_logo,
        custom_logo=workspace.custom_logo,
        custom_header_logo=workspace.custom_header_logo,
        custom_header_content=workspace.custom_header_content,
    )
    db_session.add(db_workspace)
    db_session.flush()  # give the workspace an ID

    _add_user__workspace_relationships__no_commit(
        db_session=db_session,
        workspace_id=db_workspace.id,
        user_ids=workspace.user_ids,
    )

    db_session.commit()
    return db_workspace


# def put_workspace(
#     workspace_id: int,
#     db_session: Session,
#     workspace_data: dict
# ) -> Workspace:
#     try:
#         # Attempt to retrieve the existing workspace
#         existing_workspace = db_session.scalar(select(Workspace).where(Workspace.id == workspace_id))

#         if existing_workspace:
#             # Update existing workspace
#             for key, value in workspace_data.items():
#                 setattr(existing_workspace, key, value)
#             db_session.add(existing_workspace)
#         else:
#             # Create new workspace
#             new_workspace = Workspace(id=workspace_id, **workspace_data)
#             db_session.add(new_workspace)

#         db_session.commit()
#         return existing_workspace if existing_workspace else new_workspace

#     except SQLAlchemyError as e:
#         db_session.rollback()
#         raise Exception(f"Error inserting or updating workspace: {str(e)}") from e


def upsert_workspace(
    db_session: Session,
    id: int,
    instance_id: int,
    workspace_name: str,
    custom_logo: str | None = None,
    custom_header_logo: str | None = None,
    workspace_description: str | None = None,
    use_custom_logo: bool = False,
    custom_header_content: str | None = None,
    commit: bool = True,
) -> Workspace:
    try:
        # Check if the workspace already exists
        workspace = db_session.scalar(select(Workspace).where(Workspace.id == id))

        if workspace:
            # Update existing workspace
            workspace.instance_id = instance_id
            workspace.workspace_name = workspace_name
            workspace.custom_logo = custom_logo
            workspace.custom_header_logo = custom_header_logo
            workspace.workspace_description = workspace_description
            workspace.use_custom_logo = use_custom_logo
            workspace.custom_header_content = custom_header_content
        else:
            # Create new workspace
            workspace = Workspace(
                id=id,
                instance_id=instance_id,
                workspace_name=workspace_name,
                custom_logo=custom_logo,
                custom_header_logo=custom_header_logo,
                workspace_description=workspace_description,
                use_custom_logo=use_custom_logo,
                custom_header_content=custom_header_content,
            )
            db_session.add(workspace)

        if commit:
            db_session.commit()
        else:
            # Flush the session so that the Prompt has an ID
            db_session.flush()

        return workspace

    except SQLAlchemyError as e:
        # Roll back the changes in case of an error
        db_session.rollback()
        raise Exception(f"Error upserting workspace: {str(e)}") from e


def get_workspaces_for_user(user_id: int, db_session: Session) -> list[Workspace]:
    stmt = (
        select(Workspace)
        .join(Workspace__Users)
        .join(User)
        .where(User.id == user_id)
        .options(joinedload(Workspace.users))
    )

    workspaces = db_session.scalars(stmt).all()
    return workspaces


def get_workspace_by_id(
    workspace_id: int,
    db_session: Session,
    user: User | None = None,
) -> Workspace | None:
    stmt = select(Workspace).where(Workspace.id == workspace_id)

    if user and user.role == UserRole.BASIC:
        stmt = stmt.join(Workspace__Users).join(User).where(User.id == user.id)

    workspace = db_session.scalar(stmt)
    return workspace


def get_workspace_settings(db_session: Session) -> Workspace | None:
    workspace = db_session.scalar(select(Workspace))
    return workspace
