from typing import Any

from posthog import Posthog

from ee.onyx.configs.app_configs import POSTHOG_API_KEY
from ee.onyx.configs.app_configs import POSTHOG_HOST
from onyx.utils.logger import setup_logger

logger = setup_logger()


def posthog_on_error(error: Any, items: Any) -> None:
    logger.error(f"PostHog error: {error}, items: {items}")


posthog = Posthog(
    project_api_key=POSTHOG_API_KEY,
    host=POSTHOG_HOST,
    debug=True,
    on_error=posthog_on_error,
)


def event_telemetry(
    distinct_id: str, event: str, properties: dict | None = None
) -> None:
    logger.info(f"Capturing Posthog event: {distinct_id} {event} {properties}")
    print("API KEY", POSTHOG_API_KEY)
    print("HOST", POSTHOG_HOST)
    try:
        print(type(distinct_id))
        print(type(event))
        print(type(properties))
        response = posthog.capture(distinct_id, event, properties)
        posthog.flush()
        print(response)
    except Exception as e:
        logger.error(f"Error capturing Posthog event: {e}")
