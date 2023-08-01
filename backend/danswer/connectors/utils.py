from collections.abc import Callable
from collections.abc import Generator
from collections.abc import Iterator
from itertools import islice
from typing import TypeVar

T = TypeVar("T")


def batch_generator(
    generator: Iterator[T],
    batch_size: int,
    pre_batch_yield: Callable[[list[T]], None] | None = None,
) -> Generator[list[T], None, None]:
    while True:
        batch = list(islice(generator, batch_size))
        if not batch:
            return

        if pre_batch_yield:
            pre_batch_yield(batch)
        yield batch
