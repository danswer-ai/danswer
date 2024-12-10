import multiprocessing
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from tests.integration.introspection import list_all_tests
from tests.integration.kickoff import BACKEND_DIR_PATH
from tests.integration.kickoff import DeploymentConfig
from tests.integration.kickoff import get_db_name
from tests.integration.kickoff import run_x_instances
from tests.integration.kickoff import SharedServicesConfig


@dataclass
class TestResult:
    test_name: str
    success: bool
    output: str
    error: str | None = None


def run_single_test(
    test_name: str,
    deployment_config: DeploymentConfig,
    shared_services_config: SharedServicesConfig,
    queue: multiprocessing.Queue,
) -> None:
    """Run a single test with the given API port."""
    test_path, test_name = test_name.split("::")
    processed_test_name = (
        f"tests/integration/{test_path.replace('.', '/')}.py::{test_name}"
    )
    print(f"Running test: {processed_test_name}")
    try:
        result = subprocess.run(
            ["pytest", processed_test_name, "-v"],
            env={
                **os.environ,
                "API_SERVER_PORT": str(deployment_config.api_port),
                "PYTHONPATH": ".",
                "GUARANTEED_FRESH_SETUP": "true",
                "POSTGRES_PORT": str(shared_services_config.postgres_port),
                "POSTGRES_DB": get_db_name(deployment_config.instance_num),
                "VESPA_PORT": str(shared_services_config.vespa_port),
                "VESPA_TENANT_PORT": str(shared_services_config.vespa_tenant_port),
            },
            cwd=str(BACKEND_DIR_PATH),
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


def main() -> None:
    # Get all tests
    tests = list_all_tests(Path(__file__).parent)
    print(f"Found {len(tests)} tests to run")

    # For debugging
    # tests = [test for test in tests if "openai_assistants_api" in test]
    # tests = tests[:2]
    # print(f"Running {len(tests)} tests")

    # Start all instances at once
    shared_services_config, deployment_configs = run_x_instances(len(tests))

    # Create a queue for test results
    result_queue: multiprocessing.Queue = multiprocessing.Queue()

    # Start all tests in parallel
    processes = []
    for test, deployment_config in zip(tests, deployment_configs):
        print(f"Starting test: {test}")
        p = multiprocessing.Process(
            target=run_single_test,
            args=(
                test,
                deployment_config,
                shared_services_config,
                result_queue,
            ),
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
