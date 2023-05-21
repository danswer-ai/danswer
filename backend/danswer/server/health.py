from danswer.server.models import HealthCheckResponse
from fastapi import APIRouter


router = APIRouter()


@router.get("/health")
def healthcheck() -> HealthCheckResponse:
    return {"status": "ok"}
