#!/usr/bin/env python3
import atexit
import os
import random
import signal
import socket
import subprocess
import sys
import time
import uuid
from collections.abc import Callable
from multiprocessing.pool import ThreadPool
from pathlib import Path
from typing import NamedTuple

import requests
import yaml

from danswer.document_index.vespa.index import VespaIndex


BACKEND_DIR_PATH = Path(__file__).parent.parent.parent
COMPOSE_DIR_PATH = BACKEND_DIR_PATH.parent / "deployment/docker_compose"

DEFAULT_EMBEDDING_DIMENSION = 768
DEFAULT_SCHEMA_NAME = "danswer_chunk_nomic_ai_nomic_embed_text_v1"


class DeploymentConfig(NamedTuple):
    instance_num: int
    api_port: int
    web_port: int
    nginx_port: int
    redis_port: int


class SharedServicesConfig(NamedTuple):
    run_id: uuid.UUID
    postgres_port: int
    vespa_port: int
    vespa_tenant_port: int


def get_random_port() -> int:
    """Find a random available port."""
    while True:
        port = random.randint(10000, 65535)
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            if sock.connect_ex(("localhost", port)) != 0:
                return port


def cleanup_pid(pid: int) -> None:
    """Cleanup a specific PID."""
    print(f"Killing process {pid}")
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        print(f"Process {pid} not found")


def get_shared_services_stack_name(run_id: uuid.UUID) -> str:
    return f"base-danswer-{run_id}"


def get_db_name(instance_num: int) -> str:
    """Get the database name for a given instance number."""
    return f"danswer_{instance_num}"


def get_vector_db_prefix(instance_num: int) -> str:
    """Get the vector DB prefix for a given instance number."""
    return f"test_instance_{instance_num}"


def setup_db(
    instance_num: int,
    postgres_port: int,
) -> None:
    env = os.environ.copy()

    # Wait for postgres to be ready
    max_attempts = 10
    for attempt in range(max_attempts):
        try:
            subprocess.run(
                [
                    "psql",
                    "-h",
                    "localhost",
                    "-p",
                    str(postgres_port),
                    "-U",
                    "postgres",
                    "-c",
                    "SELECT 1",
                ],
                env={**env, "PGPASSWORD": "password"},
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            break
        except subprocess.CalledProcessError:
            if attempt == max_attempts - 1:
                raise RuntimeError("Postgres failed to become ready within timeout")
            time.sleep(1)

    db_name = get_db_name(instance_num)
    # Create the database first
    subprocess.run(
        [
            "psql",
            "-h",
            "localhost",
            "-p",
            str(postgres_port),
            "-U",
            "postgres",
            "-c",
            f"CREATE DATABASE {db_name}",
        ],
        env={**env, "PGPASSWORD": "password"},
        check=True,
    )

    # Run alembic upgrade to create tables
    subprocess.run(
        ["alembic", "upgrade", "head"],
        env={
            **env,
            "POSTGRES_HOST": "localhost",
            "POSTGRES_PORT": str(postgres_port),
            "POSTGRES_DB": db_name,
        },
        check=True,
        cwd=str(BACKEND_DIR_PATH),
    )


def start_api_server(
    instance_num: int,
    model_server_port: int,
    postgres_port: int,
    vespa_port: int,
    vespa_tenant_port: int,
    redis_port: int,
    register_process: Callable[[subprocess.Popen], None],
) -> int:
    """Start the API server.

    NOTE: assumes that Postgres is all set up (database exists, migrations ran)
    """
    print("Starting API server...")
    db_name = get_db_name(instance_num)
    vector_db_prefix = get_vector_db_prefix(instance_num)

    env = os.environ.copy()
    env.update(
        {
            "POSTGRES_HOST": "localhost",
            "POSTGRES_PORT": str(postgres_port),
            "POSTGRES_DB": db_name,
            "REDIS_HOST": "localhost",
            "REDIS_PORT": str(redis_port),
            "VESPA_HOST": "localhost",
            "VESPA_PORT": str(vespa_port),
            "VESPA_TENANT_PORT": str(vespa_tenant_port),
            "MODEL_SERVER_PORT": str(model_server_port),
            "VECTOR_DB_INDEX_NAME_PREFIX__INTEGRATION_TEST_ONLY": vector_db_prefix,
            "LOG_LEVEL": "debug",
        }
    )

    port = get_random_port()

    # Open log file for API server in /tmp
    log_file = open(f"/tmp/api_server_{instance_num}.txt", "w")

    process = subprocess.Popen(
        [
            "uvicorn",
            "danswer.main:app",
            "--host",
            "localhost",
            "--port",
            str(port),
        ],
        env=env,
        cwd=str(BACKEND_DIR_PATH),
        stdout=log_file,
        stderr=subprocess.STDOUT,
    )
    register_process(process)

    return port


def start_model_server(
    instance_num: int,
    postgres_port: int,
    vespa_port: int,
    vespa_tenant_port: int,
    redis_port: int,
    register_process: Callable[[subprocess.Popen], None],
) -> int:
    """Start the model server."""
    print("Starting model server...")

    env = os.environ.copy()
    env.update(
        {
            "POSTGRES_HOST": "localhost",
            "POSTGRES_PORT": str(postgres_port),
            "REDIS_HOST": "localhost",
            "REDIS_PORT": str(redis_port),
            "VESPA_HOST": "localhost",
            "VESPA_PORT": str(vespa_port),
            "VESPA_TENANT_PORT": str(vespa_tenant_port),
            "LOG_LEVEL": "debug",
        }
    )

    port = get_random_port()

    # Open log file for model server in /tmp
    log_file = open(f"/tmp/model_server_{instance_num}.txt", "w")

    process = subprocess.Popen(
        [
            "uvicorn",
            "model_server.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            str(port),
        ],
        env=env,
        cwd=str(BACKEND_DIR_PATH),
        stdout=log_file,
        stderr=subprocess.STDOUT,
    )
    register_process(process)

    return port


def start_background(
    instance_num: int,
    postgres_port: int,
    vespa_port: int,
    vespa_tenant_port: int,
    redis_port: int,
    register_process: Callable[[subprocess.Popen], None],
) -> None:
    """Start the background process."""
    print("Starting background process...")
    env = os.environ.copy()
    env.update(
        {
            "POSTGRES_HOST": "localhost",
            "POSTGRES_PORT": str(postgres_port),
            "POSTGRES_DB": get_db_name(instance_num),
            "REDIS_HOST": "localhost",
            "REDIS_PORT": str(redis_port),
            "VESPA_HOST": "localhost",
            "VESPA_PORT": str(vespa_port),
            "VESPA_TENANT_PORT": str(vespa_tenant_port),
            "VECTOR_DB_INDEX_NAME_PREFIX__INTEGRATION_TEST_ONLY": get_vector_db_prefix(
                instance_num
            ),
            "LOG_LEVEL": "debug",
        }
    )

    str(Path(__file__).parent / "backend")

    # Open log file for background process in /tmp
    log_file = open(f"/tmp/background_{instance_num}.txt", "w")

    process = subprocess.Popen(
        ["supervisord", "-n", "-c", "./supervisord.conf"],
        env=env,
        cwd=str(BACKEND_DIR_PATH),
        stdout=log_file,
        stderr=subprocess.STDOUT,
    )
    register_process(process)


def start_shared_services(run_id: uuid.UUID) -> SharedServicesConfig:
    """Start Postgres and Vespa using docker-compose.
    Returns (postgres_port, vespa_port, vespa_tenant_port)
    """
    print("Starting database services...")

    postgres_port = get_random_port()
    vespa_port = get_random_port()
    vespa_tenant_port = get_random_port()

    minimal_compose = {
        "services": {
            "relational_db": {
                "image": "postgres:15.2-alpine",
                "command": "-c 'max_connections=250'",
                "environment": {
                    "POSTGRES_USER": os.getenv("POSTGRES_USER", "postgres"),
                    "POSTGRES_PASSWORD": os.getenv("POSTGRES_PASSWORD", "password"),
                },
                "ports": [f"{postgres_port}:5432"],
            },
            "index": {
                "image": "vespaengine/vespa:8.277.17",
                "ports": [
                    f"{vespa_port}:8081",  # Main Vespa port
                    f"{vespa_tenant_port}:19071",  # Tenant port
                ],
            },
        },
    }

    # Write the minimal compose file
    temp_compose = Path("/tmp/docker-compose.minimal.yml")
    with open(temp_compose, "w") as f:
        yaml.dump(minimal_compose, f)

    # Start the services
    subprocess.run(
        [
            "docker",
            "compose",
            "-f",
            str(temp_compose),
            "-p",
            get_shared_services_stack_name(run_id),
            "up",
            "-d",
        ],
        check=True,
    )

    return SharedServicesConfig(run_id, postgres_port, vespa_port, vespa_tenant_port)


def prepare_vespa(instance_ids: list[int], vespa_tenant_port: int) -> None:
    schema_names = [
        (
            f"{get_vector_db_prefix(instance_id)}_{DEFAULT_SCHEMA_NAME}",
            DEFAULT_EMBEDDING_DIMENSION,
            False,
        )
        for instance_id in instance_ids
    ]
    print(f"Creating indices: {schema_names}")
    for _ in range(7):
        try:
            VespaIndex.create_indices(
                schema_names, f"http://localhost:{vespa_tenant_port}/application/v2"
            )
            return
        except Exception as e:
            print(f"Error creating indices: {e}. Trying again in 5 seconds...")
            time.sleep(5)

    raise RuntimeError("Failed to create indices in Vespa")


def start_redis(
    instance_num: int,
    register_process: Callable[[subprocess.Popen], None],
) -> int:
    """Start a Redis instance for a specific deployment."""
    print(f"Starting Redis for instance {instance_num}...")

    redis_port = get_random_port()

    # Create a Redis-specific compose file
    redis_compose = {
        "services": {
            f"cache_{instance_num}": {
                "image": "redis:7.4-alpine",
                "ports": [f"{redis_port}:6379"],
                "command": 'redis-server --save "" --appendonly no',
            },
        },
    }

    temp_compose = Path(f"/tmp/docker-compose.redis.{instance_num}.yml")
    with open(temp_compose, "w") as f:
        yaml.dump(redis_compose, f)

    subprocess.run(
        [
            "docker",
            "compose",
            "-f",
            str(temp_compose),
            "-p",
            f"redis-danswer-{instance_num}",
            "up",
            "-d",
        ],
        check=True,
    )

    return redis_port


def launch_instance(
    instance_num: int,
    postgres_port: int,
    vespa_port: int,
    vespa_tenant_port: int,
    register_process: Callable[[subprocess.Popen], None],
) -> DeploymentConfig:
    """Launch a Docker Compose instance with custom ports."""
    api_port = get_random_port()
    web_port = get_random_port()
    nginx_port = get_random_port()

    # Start Redis for this instance
    redis_port = start_redis(instance_num, register_process)

    try:
        model_server_port = start_model_server(
            instance_num,
            postgres_port,
            vespa_port,
            vespa_tenant_port,
            redis_port,  # Pass instance-specific Redis port
            register_process,
        )
        setup_db(instance_num, postgres_port)
        api_port = start_api_server(
            instance_num,
            model_server_port,
            postgres_port,
            vespa_port,
            vespa_tenant_port,
            redis_port,
            register_process,
        )
        start_background(
            instance_num,
            postgres_port,
            vespa_port,
            vespa_tenant_port,
            redis_port,
            register_process,
        )
    except Exception as e:
        print(f"Failed to start API server for instance {instance_num}: {e}")
        raise

    return DeploymentConfig(instance_num, api_port, web_port, nginx_port, redis_port)


def wait_for_instance(
    ports: DeploymentConfig, max_attempts: int = 60, wait_seconds: int = 2
) -> None:
    """Wait for an instance to be healthy."""
    print(f"Waiting for instance {ports.instance_num} to be ready...")

    for attempt in range(1, max_attempts + 1):
        try:
            response = requests.get(f"http://localhost:{ports.api_port}/health")
            if response.status_code == 200:
                print(
                    f"Instance {ports.instance_num} is ready on port {ports.api_port}"
                )
                return
            raise ConnectionError(
                f"Health check returned status {response.status_code}"
            )
        except (requests.RequestException, ConnectionError):
            if attempt == max_attempts:
                raise TimeoutError(
                    f"Timeout waiting for instance {ports.instance_num} "
                    f"on port {ports.api_port}"
                )
            print(
                f"Waiting for instance {ports.instance_num} on port "
                f" {ports.api_port}... ({attempt}/{max_attempts})"
            )
            time.sleep(wait_seconds)


def cleanup_instance(instance_num: int) -> None:
    """Cleanup a specific instance."""
    print(f"Cleaning up instance {instance_num}...")
    temp_compose = Path(f"/tmp/docker-compose.dev.instance{instance_num}.yml")

    try:
        subprocess.run(
            [
                "docker",
                "compose",
                "-f",
                str(temp_compose),
                "-p",
                f"danswer-stack-{instance_num}",
                "down",
            ],
            check=True,
        )
        print(f"Instance {instance_num} cleaned up successfully")
    except subprocess.CalledProcessError:
        print(f"Error cleaning up instance {instance_num}")
    except FileNotFoundError:
        print(f"No compose file found for instance {instance_num}")
    finally:
        # Clean up the temporary compose file if it exists
        if temp_compose.exists():
            temp_compose.unlink()
            print(f"Removed temporary compose file for instance {instance_num}")


def run_x_instances(
    num_instances: int,
) -> tuple[SharedServicesConfig, list[DeploymentConfig]]:
    """Start x instances of the application and return their configurations."""
    run_id = uuid.uuid4()
    instance_ids = list(range(1, num_instances + 1))
    _pids: list[int] = []

    def register_process(process) -> None:
        _pids.append(process.pid)

    def cleanup_all_instances() -> None:
        """Cleanup all instances."""
        print("Cleaning up all instances...")

        # Stop the database services
        subprocess.run(
            [
                "docker",
                "compose",
                "-p",
                get_shared_services_stack_name(run_id),
                "-f",
                "/tmp/docker-compose.minimal.yml",
                "down",
            ],
            check=True,
        )

        # Stop all Redis instances
        for compose_file in Path("/tmp").glob("docker-compose.redis.*.yml"):
            instance_id = compose_file.stem.split(".")[
                -1
            ]  # Extract instance number from filename
            try:
                subprocess.run(
                    [
                        "docker",
                        "compose",
                        "-f",
                        str(compose_file),
                        "-p",
                        f"redis-danswer-{instance_id}",
                        "down",
                    ],
                    check=True,
                )
                compose_file.unlink()  # Remove the temporary compose file
            except subprocess.CalledProcessError:
                print(f"Error cleaning up Redis instance {instance_id}")

        for pid in _pids:
            cleanup_pid(pid)

    # Register cleanup handler
    atexit.register(cleanup_all_instances)

    # Start database services first
    print("Starting shared services...")
    shared_services_config = start_shared_services(run_id)

    # create documents
    print("Creating indices in Vespa...")
    prepare_vespa(instance_ids, shared_services_config.vespa_tenant_port)

    # Use ThreadPool to launch instances in parallel and collect results
    print("Launching instances...")
    with ThreadPool(processes=num_instances) as pool:
        # Create list of arguments for each instance
        launch_args = [
            (
                i,
                shared_services_config.postgres_port,
                shared_services_config.vespa_port,
                shared_services_config.vespa_tenant_port,
                register_process,
            )
            for i in instance_ids
        ]

        # Launch instances and get results
        port_configs = pool.starmap(launch_instance, launch_args)

    # Wait for all instances to be healthy
    print("Waiting for instances to be healthy...")
    with ThreadPool(processes=len(port_configs)) as pool:
        pool.map(wait_for_instance, port_configs)

    print("All instances launched!")
    print("Database Services:")
    print(f"Postgres port: {shared_services_config.postgres_port}")
    print(f"Vespa main port: {shared_services_config.vespa_port}")
    print(f"Vespa tenant port: {shared_services_config.vespa_tenant_port}")
    print("\nApplication Instances:")
    for ports in port_configs:
        print(
            f"Instance {ports.instance_num}: "
            f"API={ports.api_port}, Web={ports.web_port}, Nginx={ports.nginx_port}"
        )

    return shared_services_config, port_configs


def main() -> None:
    shared_services_config, port_configs = run_x_instances(1)

    # Run pytest with the API server port set
    api_port = port_configs[0].api_port  # Use first instance's API port
    try:
        subprocess.run(
            ["pytest", "tests/integration/openai_assistants_api"],
            env={**os.environ, "API_SERVER_PORT": str(api_port)},
            cwd=str(BACKEND_DIR_PATH),
            check=True,
        )
    except subprocess.CalledProcessError as e:
        print(f"Tests failed with exit code {e.returncode}")
        sys.exit(e.returncode)

    time.sleep(5)


if __name__ == "__main__":
    main()
