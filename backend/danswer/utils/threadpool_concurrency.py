from collections.abc import Callable
from concurrent.futures import as_completed
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from danswer.utils.logger import setup_logger

logger = setup_logger()


def run_functions_in_parallel(
    functions_with_args: dict[Callable, tuple]
) -> dict[str, Any]:
    """
    Executes multiple functions in parallel and returns a dictionary with the results.

    Args:
        functions_with_args (dict): A dictionary mapping functions to a tuple of arguments.

    Returns:
        dict: A dictionary mapping function names to their results or error messages.
    """
    results = {}
    with ThreadPoolExecutor(max_workers=len(functions_with_args)) as executor:
        future_to_function = {
            executor.submit(func, *args): func.__name__
            for func, args in functions_with_args.items()
        }

        for future in as_completed(future_to_function):
            function_name = future_to_function[future]
            try:
                results[function_name] = future.result()
            except Exception as e:
                logger.exception(f"Function {function_name} failed due to {e}")
                raise

    return results
