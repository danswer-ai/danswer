import os
from logging import getLogger
from danswer.utils.logger import setup_logger
from fastapi import APIRouter
from fastapi import Response

router = APIRouter(prefix="/api")

logger = getLogger(__name__)

@router.get("/logs")
def get_logs() -> Response:
    file_path = "/app/logs"
    files = [f for f in os.listdir(file_path) if os.path.isfile(os.path.join(file_path, f))]
    for file_name in os.listdir(file_path):
        logger.info(file_name)
    return files
