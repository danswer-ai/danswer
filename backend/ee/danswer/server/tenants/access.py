import os
from datetime import datetime
from datetime import timedelta

import jwt

DATA_PLANE_SECRET = os.getenv("DATA_PLANE_SECRET")
ALGORITHM = "HS256"


def generate_data_plane_token() -> str:
    if DATA_PLANE_SECRET is None:
        raise ValueError("DATA_PLANE_SECRET is not set")

    payload = {
        "iss": "data_plane",
        "exp": datetime.utcnow() + timedelta(minutes=5),
        "iat": datetime.utcnow(),
        "scope": "api_access",
    }
    token = jwt.encode(payload, DATA_PLANE_SECRET, algorithm=ALGORITHM)
    return token
