from fastapi import Request
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
from redis import asyncio as aioredis

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


# Rate limiters for specific endpoints
register_limiter = RateLimiter(times=5, seconds=60)
login_limiter = RateLimiter(times=10, seconds=60)


# Custom rate limiter that uses the client's IP address
def ip_rate_limit(times: int, seconds: int):
    return RateLimiter(times=times, seconds=seconds, key_func=rate_limit_key)
