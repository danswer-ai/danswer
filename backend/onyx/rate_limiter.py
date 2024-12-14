from fastapi import Depends
from fastapi import Request
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
from redis import asyncio as aioredis

from onyx.configs.app_configs import RATE_LIMIT_MAX_REQUESTS
from onyx.configs.app_configs import RATE_LIMIT_WINDOW_SECONDS
from onyx.configs.app_configs import REDIS_HOST
from onyx.configs.app_configs import REDIS_PASSWORD
from onyx.configs.app_configs import REDIS_PORT


async def setup_limiter():
    redis = await aioredis.from_url(
        f"redis://{REDIS_HOST}:{REDIS_PORT}", password=REDIS_PASSWORD
    )
    await FastAPILimiter.init(redis)


async def close_limiter():
    await FastAPILimiter.close()


def rate_limit_key(request: Request):
    return request.client.host  # Use IP address for unauthenticated users


# Custom rate limiter that uses the client's IP address
def get_auth_rate_limiters():
    if not any(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS):
        return []

    return [
        Depends(
            RateLimiter(
                times=RATE_LIMIT_MAX_REQUESTS,
                seconds=RATE_LIMIT_WINDOW_SECONDS,
                key_func=rate_limit_key,
            )
        )
    ]
