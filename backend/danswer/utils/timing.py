import time
from collections.abc import Callable

from danswer.utils.logging import setup_logger

logger = setup_logger()


def build_timing_wrapper(
    func_name: str | None = None,
) -> Callable[[Callable], Callable]:
    """Build a timing wrapper for a function. Logs how long the function took to run.
    Use like:

    @build_timing_wrapper()
    def my_func():
        ...
    """

    def timing_wrapper(func: Callable) -> Callable:
        def wrapped_func(*args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            logger.info(
                f"{func_name or func.__name__} took {time.time() - start_time} seconds"
            )
            return result

        return wrapped_func

    return timing_wrapper
