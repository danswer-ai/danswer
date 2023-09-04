import time
from collections.abc import Callable
from collections.abc import Generator
from collections.abc import Iterator
from typing import Any
from typing import cast
from typing import TypeVar

from danswer.utils.logger import setup_logger

logger = setup_logger()

F = TypeVar("F", bound=Callable)
FG = TypeVar("FG", bound=Callable[..., Generator | Iterator])


def log_function_time(
    func_name: str | None = None,
) -> Callable[[F], F]:
    """Build a timing wrapper for a function. Logs how long the function took to run.
    Use like:

    @log_function_time()
    def my_func():
        ...
    """

    def timing_wrapper(func: F) -> F:
        def wrapped_func(*args: Any, **kwargs: Any) -> Any:
            start_time = time.time()
            result = func(*args, **kwargs)
            logger.info(
                f"{func_name or func.__name__} took {time.time() - start_time} seconds"
            )
            return result

        return cast(F, wrapped_func)

    return timing_wrapper


def log_generator_function_time(
    func_name: str | None = None,
) -> Callable[[FG], FG]:
    """Build a timing wrapper for a function which returns a generator.
    Logs how long the function took to run.
    Use like:

    @log_generator_function_time()
    def my_func():
        ...
        yield X
        ...
    """

    def timing_wrapper(func: FG) -> FG:
        def wrapped_func(*args: Any, **kwargs: Any) -> Any:
            start_time = time.time()
            yield from func(*args, **kwargs)
            logger.info(
                f"{func_name or func.__name__} took {time.time() - start_time} seconds"
            )

        return cast(FG, wrapped_func)

    return timing_wrapper
