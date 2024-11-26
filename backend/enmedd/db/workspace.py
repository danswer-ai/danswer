from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload
from sqlalchemy.orm import Session

from ee.enmedd.server.workspace.models import WorkspaceUpdate
from enmedd.auth.schemas import UserRole
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


def update_workspace(
    db_session: Session,
    workspace: WorkspaceUpdate,
    commit: bool = True,
) -> Workspace:
    try:
        # Check if the workspace already exists
        db_workspace = db_session.scalar(select(Workspace).where(Workspace.id == id))

        if not db_workspace:
            # If the workspace doesn't exist, raise an error
            raise Exception(f"Workspace with ID {id} not found.")

        # Update existing workspace fields
        if workspace.workspace_name:
            db_workspace.workspace_name = workspace.workspace_name
        if workspace.custom_logo:
            db_workspace.custom_logo = workspace.custom_logo
        if workspace.custom_header_logo:
            db_workspace.custom_header_logo = workspace.custom_header_logo
        if workspace.workspace_description:
            db_workspace.workspace_description = workspace.workspace_description
        if workspace.use_custom_logo:
            db_workspace.use_custom_logo = workspace.use_custom_logo
        if workspace.custom_header_content:
            db_workspace.custom_header_content = workspace.custom_header_content

        # Commit or flush the session
        if commit:
            db_session.add(db_workspace)
            db_session.commit()
        else:
            db_session.flush()

        return db_workspace

    except SQLAlchemyError as e:
        # Roll back the changes in case of an error
        db_session.rollback()
        raise Exception(f"Error updating workspace: {str(e)}") from e


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
    brand_color: str | None = None,
    secondary_color: str | None = None,
    commit: bool = True,
) -> Workspace:
    try:
        # Check if the workspace already exists
        workspace = db_session.scalar(select(Workspace).where(Workspace.id == id))

        if workspace:
            # Update only the fields that have new values
            if instance_id is not None:
                workspace.instance_id = instance_id
            if workspace_name is not None:
                workspace.workspace_name = workspace_name
            if custom_logo is not None:
                workspace.custom_logo = custom_logo
            if custom_header_logo is not None:
                workspace.custom_header_logo = custom_header_logo
            if workspace_description is not None:
                workspace.workspace_description = workspace_description
            if use_custom_logo is not None:
                if not workspace.use_custom_logo or use_custom_logo:
                    workspace.use_custom_logo = use_custom_logo
            if custom_header_content is not None:
                workspace.custom_header_content = custom_header_content
            if brand_color is not None:
                workspace.brand_color = brand_color
            if secondary_color is not None:
                workspace.secondary_color = secondary_color
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
                brand_color=brand_color,
                secondary_color=secondary_color,
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


def get_workspace_for_user_by_id(
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
