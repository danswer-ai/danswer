import os
import signal
import subprocess
import time


def run_services() -> None:
    processes = {}

    # Docker commands for services that will run in containers
    docker_services = {
        "relational_db": "docker run --name postgres -e POSTGRES_PASSWORD=password -d -p 5432:5432 postgres",
        "index": "docker run --name vespa -d -p 8081:8081 -p 19071:19071 vespaengine/vespa",
    }

    # Local services
    local_services = {
        "api_server": "/bin/sh -c 'alembic upgrade head && "
        'echo "Starting Danswer Api Server" && '
        "uvicorn danswer.main:app --host 0.0.0.0 --port 8080'",
        "inference_model_server": "uvicorn model_server.main:app --host 0.0.0.0 --port 9000",
        "indexing_model_server": "uvicorn model_server.main:app --host 0.0.0.0 --port 9001",
        "background": "/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf",
    }

    # Start Docker services
    for service_name, command in docker_services.items():
        print(f"Starting Docker container for {service_name}...")
        process = subprocess.Popen(command, shell=True)
        processes[service_name] = process
        time.sleep(10)  # Wait for 10 seconds to ensure container is up

    # Start local services
    for service_name, command in local_services.items():
        print(f"Starting {service_name}...")
        env = os.environ.copy()
        process = subprocess.Popen(command, shell=True, env=env)
        processes[service_name] = process
        time.sleep(5)  # Wait for 5 seconds between starting each service

    print("All services have been started.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping all services...")
        for service_name, process in processes.items():
            print(f"Stopping {service_name}...")
            if service_name in docker_services:
                subprocess.run(f"docker stop {service_name}", shell=True)
                subprocess.run(f"docker rm {service_name}", shell=True)
            else:
                process.send_signal(signal.SIGINT)
                process.wait()
        print("All services have been stopped.")


if __name__ == "__main__":
    run_services()
