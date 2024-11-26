from datetime import datetime
from datetime import timezone
from typing import Any

import httpx
from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Response
from fastapi import status
from fastapi import UploadFile
from pydantic import BaseModel
from pydantic import Field
from sqlalchemy.orm import Session

from ee.enmedd.server.workspace.models import AnalyticsScriptUpload
from ee.enmedd.server.workspace.models import Workspaces
from ee.enmedd.server.workspace.store import _HEADERLOGO_FILENAME
from ee.enmedd.server.workspace.store import _LOGO_FILENAME
from ee.enmedd.server.workspace.store import _LOGOTYPE_FILENAME
from ee.enmedd.server.workspace.store import load_analytics_script
from ee.enmedd.server.workspace.store import store_analytics_script
from ee.enmedd.server.workspace.store import upload_header_logo
from ee.enmedd.server.workspace.store import upload_logo
from enmedd.auth.users import current_user
from enmedd.auth.users import current_user_with_expired_token
from enmedd.auth.users import current_workspace_admin_user
from enmedd.auth.users import get_user_manager
from enmedd.auth.users import UserManager
from enmedd.db.engine import get_session
from enmedd.db.models import User
from enmedd.db.models import Workspace
from enmedd.db.workspace import get_workspace_settings
from enmedd.db.workspace import upsert_workspace
from enmedd.file_store.file_store import get_default_file_store
from enmedd.utils.logger import setup_logger

# from enmedd.db.workspace import put_workspace

admin_router = APIRouter(prefix="/admin/workspace")
basic_router = APIRouter(prefix="/workspace")

logger = setup_logger()


class RefreshTokenData(BaseModel):
    access_token: str
    refresh_token: str
    session: dict = Field(..., description="Contains session information")
    userinfo: dict = Field(..., description="Contains user information")

    def __init__(self, **data: Any) -> None:
        super().__init__(**data)
        if "exp" not in self.session:
            raise ValueError("'exp' must be set in the session dictionary")
        if "userId" not in self.userinfo or "email" not in self.userinfo:
            raise ValueError(
                "'userId' and 'email' must be set in the userinfo dictionary"
            )


@basic_router.post("/refresh-token")
async def refresh_access_token(
    refresh_token: RefreshTokenData,
    user: User = Depends(current_user_with_expired_token),
    user_manager: UserManager = Depends(get_user_manager),
) -> None:
    try:
        logger.debug(f"Received response from Meechum auth URL for user {user.id}")

        # Extract new tokens
        new_access_token = refresh_token.access_token
        new_refresh_token = refresh_token.refresh_token

        new_expiry = datetime.fromtimestamp(
            refresh_token.session["exp"] / 1000, tz=timezone.utc
        )
        expires_at_timestamp = int(new_expiry.timestamp())

        logger.debug(f"Access token has been refreshed for user {user.id}")

        await user_manager.oauth_callback(
            oauth_name="custom",
            access_token=new_access_token,
            account_id=refresh_token.userinfo["userId"],
            account_email=refresh_token.userinfo["email"],
            expires_at=expires_at_timestamp,
            refresh_token=new_refresh_token,
            associate_by_email=True,
        )

        logger.info(f"Successfully refreshed tokens for user {user.id}")

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            logger.warning(f"Full authentication required for user {user.id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Full authentication required",
            )
        logger.error(
            f"HTTP error occurred while refreshing token for user {user.id}: {str(e)}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token",
        )
    except Exception as e:
        logger.error(
            f"Unexpected error occurred while refreshing token for user {user.id}: {str(e)}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )


# @admin_router.put("/{workspace_id}")
# def put_settings(
#     workspace_id: int,
#     settings: Workspaces,
#     _: User | None = Depends(current_workspace_admin_user),
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
    _: User | None = Depends(current_workspace_admin_user),
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
        brand_color=settings.brand_color,
        secondary_color=settings.secondary_color,
    )


# @basic_router.get("/{workspace_id}")
# def fetch_settings_by_id(
#     workspace_id: int,
#     _: User = Depends(current_workspace_admin_user),
#     db_session: Session = Depends(get_session),
# ) -> Workspaces:
#     db_workspace = get_workspace_for_user_by_id(
#         workspace_id=workspace_id, db_session=db_session, user=_
#     )
#     if db_workspace is None:
#         raise HTTPException(
#             status_code=404, detail=f"Workspace with id '{workspace_id}' not found"
#         )
#     return Workspaces.from_model(db_workspace)


@basic_router.get("")
def fetch_settings(db_session: Session = Depends(get_session)) -> Workspaces:
    settings = get_workspace_settings(db_session=db_session)
    if settings is None:
        raise HTTPException(status_code=404, detail="Workspace settings not found")
    return Workspaces.from_model(settings)


@admin_router.put("/logo")
def put_logo(
    file: UploadFile,
    workspace_id: int = 0,  # Temporary setting workspace_id to 0
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_workspace_admin_user),
) -> None:
    upload_logo(workspace_id=workspace_id, file=file, db_session=db_session)


@admin_router.put("/header-logo")
def put_header_logo(
    file: UploadFile,
    workspace_id: int = 0,  # Temporary setting workspace_id to 0
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_workspace_admin_user),
) -> None:
    upload_header_logo(workspace_id=workspace_id, file=file, db_session=db_session)


def fetch_logo_or_logotype(is_logotype: bool, db_session: Session) -> Response:
    try:
        file_store = get_default_file_store(db_session)
        filename = _LOGOTYPE_FILENAME if is_logotype else _LOGO_FILENAME
        file_io = file_store.read_file(filename, mode="b")
        # NOTE: specifying "image/jpeg" here, but it still works for pngs
        # TODO: do this properly
        return Response(content=file_io.read(), media_type="image/jpeg")
    except Exception:
        raise HTTPException(
            status_code=404,
            detail=f"No {'logotype' if is_logotype else 'logo'} file found",
        )


@basic_router.get("/logotype")
def fetch_logotype(db_session: Session = Depends(get_session)) -> Response:
    return fetch_logo_or_logotype(is_logotype=True, db_session=db_session)


@basic_router.get("/logo")
def fetch_logo(
    workspace_id: int = 0,  # Temporary setting workspace_id to 0
    _: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> Response:
    try:
        file_path = f"{workspace_id}{_LOGO_FILENAME}"

        file_store = get_default_file_store(db_session)
        file_io = file_store.read_file(file_path, mode="b")
        # NOTE: specifying "image/jpeg" here, but it still works for pngs
        # TODO: do this properly
        return Response(content=file_io.read(), media_type="image/jpeg")
    except Exception:
        raise HTTPException(status_code=404, detail="No logo file found")


@admin_router.delete("/logo")
def remove_logo(
    workspace_id: int = 0,  # Temporary setting workspace_id to 0
    db_session: Session = Depends(get_session),
    _: User = Depends(current_workspace_admin_user),
) -> dict:
    try:
        workspace = (
            db_session.query(Workspace).filter(Workspace.id == workspace_id).first()
        )
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found.")

        file_path = f"{workspace_id}{_LOGO_FILENAME}"

        file_store = get_default_file_store(db_session)
        file_store.delete_file(file_path)

        workspace.custom_logo = None
        workspace.use_custom_logo = False
        db_session.commit()

        return {"detail": "Workspace logo removed successfully."}
    except Exception as e:
        logger.error(f"Error removing workspace logo: {str(e)}")
        raise HTTPException(
            status_code=500, detail="An error occurred while removing the logo."
        )


@admin_router.delete("/header-logo")
def remove_header_logo(
    workspace_id: int = 0,  # Temporary setting workspace_id to 0
    db_session: Session = Depends(get_session),
    _: User = Depends(current_workspace_admin_user),
) -> dict:
    try:
        workspace = (
            db_session.query(Workspace).filter(Workspace.id == workspace_id).first()
        )
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found.")

        file_path = f"{workspace_id}{_HEADERLOGO_FILENAME}"

        file_store = get_default_file_store(db_session)
        file_store.delete_file(file_path)

        workspace.custom_header_logo = None
        db_session.commit()

        return {"detail": "Workspace header logo removed successfully."}
    except Exception as e:
        logger.error(f"Error removing workspace header logo: {str(e)}")
        raise HTTPException(
            status_code=500, detail="An error occurred while removing the header logo."
        )


@admin_router.put("/custom-analytics-script")
def upload_custom_analytics_script(
    script_upload: AnalyticsScriptUpload,
    _: User | None = Depends(current_workspace_admin_user),
) -> None:
    try:
        store_analytics_script(script_upload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@basic_router.get("/custom-analytics-script")
def fetch_custom_analytics_script() -> str | None:
    return load_analytics_script()
