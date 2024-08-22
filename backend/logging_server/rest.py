import io
import os
import zipfile
from fastapi import APIRouter
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.responses import StreamingResponse
from fastapi.encoders import jsonable_encoder
from logging import getLogger
from logging_server.utils import write_log
from typing import Any, List, Dict
from urllib.parse import parse_qs

router = APIRouter()

logger = getLogger(__name__)

@router.get("/logs")
def get_logs() -> JSONResponse:
    file_path = "/app/logs"
    files = [f for f in os.listdir(file_path) if os.path.isfile(os.path.join(file_path, f))]
    logger.info(files)
    return JSONResponse(content=jsonable_encoder(files))

@router.post("/logs")
def fetch_logs(
    files: List[str]
):
    logger.info("Fetching Log Files")
    file_path = "/app/logs"
    zip_bytes = io.BytesIO()
    with zipfile.ZipFile(zip_bytes, 'w', zipfile.ZIP_DEFLATED) as zipped:
        for file in files:
            zipped.write(os.path.join(file_path, file))
    response = StreamingResponse(
        iter([zip_bytes.getvalue()]),
        media_type="application/x-zip-compressed",
        headers = {
            "Content-Disposition": f"attachment; filename=debug_files.zip",
            "Content-Length": str(zip_bytes.getbuffer().nbytes)
        }
    )
    zip_bytes.close()
    return response

@router.post("/logs/add/")
async def add_log(request: Request):
    body = await request.body()
    body_dict = parse_qs(body.decode('utf-8'))
    log_record = {key: value[0] for key, value in body_dict.items()}
    write_log(log_record)