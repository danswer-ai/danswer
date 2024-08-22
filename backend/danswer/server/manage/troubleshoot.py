import json
# import os
import requests
from fastapi.responses import StreamingResponse
from danswer.auth.users import current_admin_user
from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.utils.logger import setup_logger
from fastapi import APIRouter
from fastapi import Depends
# from shared_configs.configs import DEV_LOGGING_ENABLED
from shared_configs.configs import EXTERNAL_LOGGING_USE_HTTPS
# from shared_configs.configs import LOG_FILE_NAME
from shared_configs.configs import LOGGING_SERVER_HOST_NAME
from shared_configs.configs import LOGGING_SERVER_PORT
from sqlalchemy.orm import Session
from typing import List

router = APIRouter(prefix="/manage")
logger = setup_logger()

@router.get("/admin/troubleshoot/logs")
def get_logs(
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
):
    protocol = "https://" if EXTERNAL_LOGGING_USE_HTTPS else "http://"
    url = f"{protocol}{LOGGING_SERVER_HOST_NAME}:{LOGGING_SERVER_PORT}/logs"
    # FIXME: local development improvement
    # is_containerized = os.path.exists("/.dockerenv")
    # if not LOG_FILE_NAME or not (is_containerized or DEV_LOGGING_ENABLED):
    #     return [] # maybe throw an error
    # if is_containerized:
    #     try:
    #         response = requests.get(url)
    #         return {"files": response.content}
    #     except Exception as e:
    #         logger.error(e)
    #         return {"error": "bad_request", "url": str(url)}
    try:
        response = requests.get(url)
        logger.info(f"Requesting files {response.json()}")
        return {"files": response.json()}
    except Exception as e:
        logger.error(e)
        return {"error": "bad_request", "url": str(url)}

@router.post("/admin/troubleshoot/logs")
def fetch_files(
    files: List[str],
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
):
    logger.info("Fetching")
    protocol = "https://" if EXTERNAL_LOGGING_USE_HTTPS else "http://"
    url = f"{protocol}{LOGGING_SERVER_HOST_NAME}:{LOGGING_SERVER_PORT}/logs"
    try:
        response = requests.post(url, data=json.dumps(files))
        return StreamingResponse(
            iter([response.content]),
            media_type="application/x-zip-compressed",
            headers={
                "Content-Disposition": f"attachment; filename=debug_files.zip",
                "Content-Length": response.headers.get("Content-Length"),
            },
        )

    except Exception as e:
        logger.error(e)
        return {"error": "bad_request", "url": str(url)}