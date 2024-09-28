import jwt
from fastapi import HTTPException
from fastapi import Request

from danswer.configs.app_configs import DATA_PLANE_SECRET
from danswer.configs.app_configs import EXPECTED_API_KEY
from danswer.utils.logger import setup_logger

logger = setup_logger()


async def control_plane_dep(request: Request) -> None:
    api_key = request.headers.get("X-API-KEY")
    if api_key != EXPECTED_API_KEY:
        logger.warning("Invalid API key")
        raise HTTPException(status_code=401, detail="Invalid API key")

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.warning("Invalid authorization header")
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, DATA_PLANE_SECRET, algorithms=["HS256"])
        if payload.get("scope") != "tenant:create":
            logger.warning("Insufficient permissions")
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        logger.warning("Invalid token")
        raise HTTPException(status_code=401, detail="Invalid token")
