from fastapi import APIRouter

from danswer import __version__
from danswer.configs.app_configs import AUTH_TYPE
from danswer.server.manage.models import AuthTypeResponse
from danswer.server.manage.models import VersionResponse
from danswer.server.models import StatusResponse

router = APIRouter()


@router.get("/health")
def healthcheck() -> StatusResponse:
    return StatusResponse(success=True, message="ok")


@router.get("/auth/type")
def get_auth_type() -> AuthTypeResponse:
    return AuthTypeResponse(auth_type=AUTH_TYPE)


@router.get("/version")
def get_version() -> VersionResponse:
    return VersionResponse(backend_version=__version__)
