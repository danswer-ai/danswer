from typing import List

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ee.enmedd.server.workspace.models import WorkspaceCreate
from enmedd.auth.users import current_admin_user
from enmedd.auth.users import current_workspace_admin_user
from enmedd.db.engine import get_session
from enmedd.db.instance import create_new_schema
from enmedd.db.instance import delete_schema
from enmedd.db.instance import fetch_all_schemas
from enmedd.db.instance import insert_workspace_data
from enmedd.db.instance import migrate_public_schema_to_new_schema
from enmedd.db.models import User
from enmedd.db.models import Workspace
from enmedd.server.models import MinimalWorkspaceInfo
from enmedd.server.settings.models import Settings
from enmedd.server.settings.store import store_settings
from enmedd.utils.logger import setup_logger


admin_router = APIRouter(prefix="/admin/instance")
basic_router = APIRouter(prefix="/instance")


logger = setup_logger()


# create new workspace by instance admin
@admin_router.post("/create-workspace")
def create_new_workspace(
    workspace: WorkspaceCreate,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> dict:
    schema_name = workspace.workspace_name.lower().replace(" ", "_")

    try:
        create_new_schema(db_session, schema_name)

        migrate_public_schema_to_new_schema(db_session, schema_name)

        workspace_id = insert_workspace_data(db_session, schema_name, workspace)

        default_settings = Settings()
        store_settings(
            settings=default_settings,
            db_session=db_session,
            workspace_id=workspace_id,
            schema_name=schema_name,
        )

    except IntegrityError:
        db_session.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Workspace with name '{workspace.workspace_name}' already exists.",
        )
    except Exception as e:
        db_session.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create workspace: {str(e)}",
        )

    return {"message": f"Workspace '{workspace.workspace_name}' created successfully."}


# delete workspace by instance admin or workspace admin
@admin_router.delete("/delete-workspace")
def delete_workspace(
    workspace_id: int,
    _: User = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> dict:
    workspace = db_session.query(Workspace).filter_by(id=workspace_id).first()
    schema_name = workspace.workspace_name.lower().replace(" ", "_")
    try:
        delete_schema(db_session, schema_name)
    except Exception as e:
        db_session.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to delete workspace: {str(e)}"
        )

    return {"message": "Workspace deleted successfully."}


# fetch all workspaces on different schemas
@admin_router.get("/workspaces")
def fetch_workspaces(
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> List[MinimalWorkspaceInfo]:
    try:
        # Fetch schemas from the database
        schemas = fetch_all_schemas(db_session)

        all_workspaces = []

        for schema in schemas:
            try:
                table_check = db_session.execute(
                    text(
                        "SELECT table_name FROM information_schema.tables WHERE table_schema = :schema"
                    ).params(schema=schema)
                ).fetchall()

                if not any(table[0] == "workspace" for table in table_check):
                    print(f"Schema {schema} does not contain a 'workspace' table.")
                    continue

                workspaces = db_session.execute(
                    text(
                        f"SELECT workspace_name, workspace_description, custom_logo FROM {schema}.workspace"
                    )
                ).fetchall()

                for workspace in workspaces:
                    all_workspaces.append(
                        MinimalWorkspaceInfo(
                            workspace_name=workspace[0],
                            workspace_description=workspace[1],
                            custom_logo=workspace[2],
                        )
                    )

            except SQLAlchemyError as e:
                print(f"Error querying schema {schema}: {e}")

        return all_workspaces

    except SQLAlchemyError as e:
        print(f"Error fetching schemas: {e}")
        return []
