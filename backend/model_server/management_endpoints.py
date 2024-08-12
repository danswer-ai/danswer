import torch
from fastapi import APIRouter
from fastapi import Response

router = APIRouter(prefix="/api")


@router.get("/health")
def healthcheck() -> Response:
    return Response(status_code=200)


@router.get("/gpu-status")
def gpu_status() -> dict[str, bool]:
    has_gpu = torch.cuda.is_available()
    return {"gpu_available": has_gpu}
