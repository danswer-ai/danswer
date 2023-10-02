from fastapi import APIRouter

from danswer.configs.app_configs import AUTH_TYPE
from danswer.server.models import AuthTypeResponse
from danswer.server.models import StatusResponse


router = APIRouter()


@router.get("/health")
def healthcheck() -> StatusResponse:
    return StatusResponse(success=True, message="ok")


@router.get("/auth/type")
def get_auth_type() -> AuthTypeResponse:
    return AuthTypeResponse(auth_type=AUTH_TYPE)
