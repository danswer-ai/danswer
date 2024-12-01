import multiprocessing
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from tests.integration.introspection import list_all_tests
from tests.integration.kickoff import BACKEND_DIR_PATH
from tests.integration.kickoff import DeploymentConfig
from tests.integration.kickoff import run_x_instances


@dataclass
class TestResult:
    test_name: str
    success: bool
    output: str
    error: str | None = None


def run_single_test(
    test_name: str, api_port: int, queue: multiprocessing.Queue
) -> None:
    """Run a single test with the given API port."""
    try:
        result = subprocess.run(
            ["pytest", test_name, "-v"],
            env={**os.environ, "API_SERVER_PORT": str(api_port)},
            cwd=str(BACKEND_DIR_PATH) / "tests" / "integration",
            capture_output=True,
            text=True,
        )
        queue.put(
            TestResult(
                test_name=test_name,
                success=result.returncode == 0,
                output=result.stdout,
                error=result.stderr if result.returncode != 0 else None,
            )
        )
    except Exception as e:
        queue.put(
            TestResult(
                test_name=test_name,
                success=False,
                output="",
                error=str(e),
            )
        )


def run_deployment_and_test(
    test_name: str,
    ports: DeploymentConfig,
    result_queue: multiprocessing.Queue,
) -> None:
    """Run a test against an existing deployment."""
    try:
        # Run the test
        run_single_test(test_name, ports.api_port, result_queue)
    except Exception as e:
        result_queue.put(
            TestResult(
                test_name=test_name,
                success=False,
                output="",
                error=str(e),
            )
        )


def main() -> None:
    # Get all tests
    tests = list_all_tests(Path(__file__).parent)
    print(f"Found {len(tests)} tests to run")

    # Run only 2 tests for now
    tests = tests[:2]
    print(f"Running {len(tests)} tests")

    # Start all instances at once
    run_id, port_configs = run_x_instances(len(tests))

    # Create a queue for test results
    result_queue: multiprocessing.Queue = multiprocessing.Queue()

    # Start all tests in parallel
    processes = []
    for test, ports in zip(tests, port_configs):
        p = multiprocessing.Process(
            target=run_deployment_and_test,
            args=(test, ports, result_queue),
        )
        p.start()
        processes.append(p)

    # Collect results
    results: list[TestResult] = []
    for _ in range(len(tests)):
        results.append(result_queue.get())

    # Wait for all processes to finish
    for p in processes:
        p.join()

    # Print results
    print("\nTest Results:")
    failed = False
    for result in results:
        status = "✅ PASSED" if result.success else "❌ FAILED"
        print(f"{status} - {result.test_name}")
        if not result.success:
            failed = True
            print("Error output:")
            print(result.error)
            print("Test output:")
            print(result.output)
            print("-" * 80)

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
