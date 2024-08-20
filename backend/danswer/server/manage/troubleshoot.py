import os
from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.utils.logger import fetch_log_files

router = APIRouter(prefix="/manage")

@router.get("/admin/troubleshoot/logs")
async def get_logs(
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
):
    zip_bytes = await fetch_log_files()
    response = StreamingResponse(
        iter([zip_bytes.getvalue()]),
        media_type="application/x-zip-compressed",
        headers = {
            "Content-Disposition": "attachment; filename=logs.zip",
            "Content-Length": str(zip_bytes.getbuffer().nbytes)
        }
    )
    zip_bytes.close()
    return response