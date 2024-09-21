from sqlite3 import IntegrityError

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Response
from fastapi import UploadFile
from sqlalchemy.orm import Session

from ee.enmedd.server.workspace.models import AnalyticsScriptUpload
from ee.enmedd.server.workspace.models import WorkspaceCreate
from ee.enmedd.server.workspace.models import Workspaces
from ee.enmedd.server.workspace.store import _LOGO_FILENAME
from ee.enmedd.server.workspace.store import load_analytics_script
from ee.enmedd.server.workspace.store import store_analytics_script
from ee.enmedd.server.workspace.store import upload_logo
from enmedd.auth.users import current_admin_user
from enmedd.db.engine import get_session
from enmedd.db.models import User
from enmedd.db.workspace import get_workspace_by_id
from enmedd.db.workspace import get_workspace_settings
from enmedd.db.workspace import insert_workspace
from enmedd.db.workspace import upsert_workspace
from enmedd.file_store.file_store import get_default_file_store

# from enmedd.db.workspace import put_workspace

admin_router = APIRouter(prefix="/admin/workspace")
basic_router = APIRouter(prefix="/workspace")


@admin_router.post("")
def create_workspace(
    workspace: WorkspaceCreate,
    user: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> Workspaces:
    try:
        # Insert the workspace and its instance
        db_workspace = insert_workspace(db_session, workspace, user_id=user.id)
    except IntegrityError:
        raise HTTPException(
            400,
            f"Workspace with name '{workspace.workspace_name}' already exists. Please choose a different name.",
        )
    return Workspaces.from_model(db_workspace)


# @admin_router.put("/{workspace_id}")
# def put_settings(
#     workspace_id: int,
#     settings: Workspaces,
#     _: User | None = Depends(current_admin_user),
#     db_session: Session = Depends(get_session)
# ) -> None:
#     try:
#         settings.check_validity()  # Validate settings before proceeding
#     except ValueError as e:
#         raise HTTPException(status_code=400, detail=str(e))

#     workspace_data = {
#         'workspace_name': settings.workspace_name,
#         'custom_logo': settings.custom_logo,
#         'custom_header_logo': settings.custom_header_logo,
#         'workspace_description': settings.workspace_description,
#         'use_custom_logo': settings.use_custom_logo,
#         'custom_header_content': settings.custom_header_content,
#     }

#     try:
#         put_workspace(
#             workspace_id=workspace_id,
#             db_session=db_session,
#             workspace_data=workspace_data
#         )
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

#     return {"message": "Workspace settings updated successfully"}


@admin_router.put("")
def put_settings(
    settings: Workspaces,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    try:
        settings.check_validity()  # Validate settings before proceeding
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    workspace_id = settings.id
    instance_id = settings.instance_id

    upsert_workspace(
        db_session=db_session,
        id=workspace_id,
        instance_id=instance_id,
        workspace_name=settings.workspace_name,
        custom_logo=settings.custom_logo,
        custom_header_logo=settings.custom_header_logo,
        workspace_description=settings.workspace_description,
        use_custom_logo=settings.use_custom_logo,
        custom_header_content=settings.custom_header_content,
    )


@basic_router.get("/{workspace_id}")
def fetch_settings_by_id(
    workspace_id: int,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> Workspaces:
    db_workspace = get_workspace_by_id(
        workspace_id=workspace_id, db_session=db_session, user=_
    )
    if db_workspace is None:
        raise HTTPException(
            status_code=404, detail=f"Workspace with id '{workspace_id}' not found"
        )
    return Workspaces.from_model(db_workspace)


@basic_router.get("")
def fetch_settings(db_session: Session = Depends(get_session)) -> Workspaces:
    settings = get_workspace_settings(db_session=db_session)
    if settings is None:
        raise HTTPException(status_code=404, detail="Workspace settings not found")
    return Workspaces.from_model(settings)


@admin_router.put("/logo")
def put_logo(
    file: UploadFile,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> None:
    upload_logo(file=file, db_session=db_session)


@basic_router.get("/logo")
def fetch_logo(db_session: Session = Depends(get_session)) -> Response:
    try:
        file_store = get_default_file_store(db_session)
        file_io = file_store.read_file(_LOGO_FILENAME, mode="b")
        # NOTE: specifying "image/jpeg" here, but it still works for pngs
        # TODO: do this properly
        return Response(content=file_io.read(), media_type="image/jpeg")
    except Exception:
        raise HTTPException(status_code=404, detail="No logo file found")


@admin_router.put("/custom-analytics-script")
def upload_custom_analytics_script(
    script_upload: AnalyticsScriptUpload, _: User | None = Depends(current_admin_user)
) -> None:
    try:
        store_analytics_script(script_upload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@basic_router.get("/custom-analytics-script")
def fetch_custom_analytics_script() -> str | None:
    return load_analytics_script()
