from danswer.server.models import StatusResponse
from fastapi import APIRouter


router = APIRouter()


@router.get("/health", response_model=StatusResponse)
def healthcheck() -> StatusResponse:
    return StatusResponse(success=True, message="ok")
