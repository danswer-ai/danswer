from pathlib import Path

import pytest
from _pytest.nodes import Item


def list_all_tests(directory: str | Path = ".") -> list[str]:
    """
    List all pytest test functions under the specified directory.

    Args:
        directory: Directory path to search for tests (defaults to current directory)

    Returns:
        List of test function names with their module paths
    """
    directory = Path(directory).absolute()
    print(f"Searching for tests in: {directory}")

    class TestCollector:
        def __init__(self):
            self.collected = []

        def pytest_collection_modifyitems(self, items):
            for item in items:
                if isinstance(item, Item):
                    # Get the relative path from the test file to the directory we're searching from
                    rel_path = Path(item.fspath).relative_to(directory)
                    # Remove the .py extension
                    module_path = str(rel_path.with_suffix(""))
                    # Replace directory separators with dots
                    module_path = module_path.replace("/", ".")
                    test_name = item.name
                    self.collected.append(f"{module_path}::{test_name}")

    collector = TestCollector()

    # Run pytest in collection-only mode
    pytest.main(
        [
            str(directory),
            "--collect-only",
            "-q",  # quiet mode
        ],
        plugins=[collector],
    )

    return sorted(collector.collected)


if __name__ == "__main__":
    tests = list_all_tests()
    print("\nFound tests:")
    for test in tests:
        print(f"- {test}")
