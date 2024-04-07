from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.db.engine import get_session
from danswer.db.file_store import get_default_file_store
from danswer.db.models import User
from ee.danswer.server.enterprise_settings.models import EnterpriseSettings
from ee.danswer.server.enterprise_settings.store import load_settings
from ee.danswer.server.enterprise_settings.store import store_settings


admin_router = APIRouter(prefix="/admin/enterprise-settings")
basic_router = APIRouter(prefix="/enterprise-settings")


@admin_router.put("")
def put_settings(
    settings: EnterpriseSettings, _: User | None = Depends(current_admin_user)
) -> None:
    try:
        settings.check_validity()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    store_settings(settings)


@basic_router.get("")
def fetch_settings() -> EnterpriseSettings:
    return load_settings()


_LOGO_FILENAME = "__logo__"


@admin_router.put("/logo")
def upload_logo(
    file: UploadFile,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> None:
    if (
        not file.filename.endswith(".png")
        and not file.filename.endswith(".jpg")
        and not file.filename.endswith(".jpeg")
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type - only .png, .jpg, and .jpeg files are allowed",
        )

    # Save the file to the server
    file_store = get_default_file_store(db_session)
    file_store.save_file(_LOGO_FILENAME, file.file)


@basic_router.get("/logo")
def fetch_logo(db_session: Session = Depends(get_session)) -> StreamingResponse:
    file_store = get_default_file_store(db_session)
    file_io = file_store.read_file(_LOGO_FILENAME, mode="b")
    return StreamingResponse(content=file_io, media_type="image/jpeg")
