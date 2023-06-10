import time
from collections.abc import Callable
from typing import Any

from danswer.utils.logging import setup_logger


logger = setup_logger()


def interval_run_job(job: Callable[[], Any], delay: int | float) -> None:
    while True:
        start = time.time()
        logger.info(f"Running '{job.__name__}', current time: {time.ctime(start)}")
        try:
            job()
        except Exception as e:
            logger.exception(f"Failed to run update due to {e}")
        sleep_time = delay - (time.time() - start)
        if sleep_time > 0:
            time.sleep(sleep_time)
