import json
import os
import subprocess
import sys
from typing import Any

from retry import retry


def _run_command(command: str) -> tuple[int | Any, str, str]:
    process = subprocess.Popen(
        command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    stdout, stderr = process.communicate()
    return process.returncode, stdout.decode(), stderr.decode()


def get_current_commit_sha() -> str:
    print("Getting current commit SHA...")
    returncode, stdout, stderr = _run_command("git rev-parse HEAD")

    if returncode == 0:
        sha = stdout.strip()
        print(f"Current commit SHA: {sha}")
        return sha
    else:
        print("Failed to get current commit SHA.")
        print(f"Error: {stderr}")
        sys.exit(1)


def switch_to_branch(branch: str) -> None:
    print(f"Switching to branch: {branch}...")
    returncode, _, stderr = _run_command(f"git checkout {branch}")

    if returncode == 0:
        returncode, _, stderr = _run_command("git pull")

        if returncode == 0:
            print("Repository updated successfully.")
        else:
            print(
                "Failed to update the repository. Please check your internet connection and try again."
            )
            print(f"Error: {stderr}")
            sys.exit(1)
        print(f"Successfully switched to branch: {branch}")
    else:
        print(f"Failed to switch to branch: {branch}")
        print(f"Error: {stderr}")
        sys.exit(1)


def manage_data_directories(suffix: str, base_path: str, use_cloud_gpu: bool) -> str:
    # Use the user's home directory as the base path
    target_path = os.path.join(os.path.expanduser(base_path), f"test{suffix}")
    directories = {
        "DANSWER_POSTGRES_DATA_DIR": os.path.join(target_path, "postgres/"),
        "DANSWER_VESPA_DATA_DIR": os.path.join(target_path, "vespa/"),
    }
    if not use_cloud_gpu:
        directories["DANSWER_INDEX_MODEL_CACHE_DIR"] = os.path.join(
            target_path, "index_model_cache/"
        )
        directories["DANSWER_INFERENCE_MODEL_CACHE_DIR"] = os.path.join(
            target_path, "inference_model_cache/"
        )

    # Create directories if they don't exist
    for env_var, directory in directories.items():
        os.makedirs(directory, exist_ok=True)
        os.environ[env_var] = directory
        print(f"Set {env_var} to: {directory}")
    relari_output_path = os.path.join(target_path, "relari_output/")
    os.makedirs(relari_output_path, exist_ok=True)
    return relari_output_path


def set_env_variables(
    remote_server_ip: str,
    remote_server_port: str,
    use_cloud_gpu: bool,
    llm_config: dict,
) -> None:
    env_vars: dict = {}
    env_vars["ENV_SEED_CONFIGURATION"] = json.dumps({"llms": [llm_config]})
    env_vars["ENABLE_PAID_ENTERPRISE_EDITION_FEATURES"] = "true"
    if use_cloud_gpu:
        env_vars["MODEL_SERVER_HOST"] = remote_server_ip
        env_vars["MODEL_SERVER_PORT"] = remote_server_port

    for env_var_name, env_var in env_vars.items():
        os.environ[env_var_name] = env_var
        print(f"Set {env_var_name} to: {env_var}")


def start_docker_compose(
    run_suffix: str, launch_web_ui: bool, use_cloud_gpu: bool
) -> None:
    print("Starting Docker Compose...")
    os.chdir(os.path.expanduser("~/danswer/deployment/docker_compose"))
    command = f"docker compose -f docker-compose.search-testing.yml -p danswer-stack{run_suffix} up -d"
    command += " --build"
    command += " --pull always"
    command += " --force-recreate"
    if not launch_web_ui:
        command += " --scale web_server=0"
        command += " --scale nginx=0"
    if use_cloud_gpu:
        command += " --scale indexing_model_server=0"
        command += " --scale inference_model_server=0"

    # command = "docker compose -f docker-compose.dev.yml -p danswer-stack up -d"
    # command += " --pull always"
    # command += " --force-recreate"
    # command += " --scale web_server=0"
    print("Docker Command:\n", command)

    returncode, _, stderr = _run_command(command)

    if returncode == 0:
        print("The Docker has been Composed :)")
    else:
        print("Failed to start Docker Compose. Please check the error messages above.")
        print(f"Error: {stderr}")
        sys.exit(1)


def cleanup_docker(run_suffix: str) -> None:
    print(
        f"Deleting Docker containers, volumes, and networks for project suffix: {run_suffix}"
    )

    # List all containers
    returncode, stdout, stderr = _run_command("docker ps -a --format '{{json .}}'")

    if returncode != 0:
        print(f"Failed to list Docker containers. Error: {stderr}")
        return

    containers = [json.loads(line) for line in stdout.splitlines()]

    # Filter containers by project name
    project_name = f"danswer-stack{run_suffix}"
    containers_to_delete = [
        c for c in containers if c["Names"].startswith(project_name)
    ]

    if not containers_to_delete:
        print(f"No containers found for project: {project_name}")
    else:
        # Delete filtered containers
        container_ids = " ".join([c["ID"] for c in containers_to_delete])
        returncode, _, stderr = _run_command(f"docker rm -f {container_ids}")

        if returncode == 0:
            print(
                f"Successfully deleted {len(containers_to_delete)} containers for project: {project_name}"
            )
        else:
            print(f"Failed to delete containers. Error: {stderr}")

    # List all volumes
    returncode, stdout, stderr = _run_command("docker volume ls --format '{{.Name}}'")

    if returncode != 0:
        print(f"Failed to list Docker volumes. Error: {stderr}")
        return

    volumes = stdout.splitlines()

    # Filter volumes by project name
    volumes_to_delete = [v for v in volumes if v.startswith(project_name)]

    if not volumes_to_delete:
        print(f"No volumes found for project: {project_name}")
        return

    # Delete filtered volumes
    volume_names = " ".join(volumes_to_delete)
    returncode, _, stderr = _run_command(f"docker volume rm {volume_names}")

    if returncode == 0:
        print(
            f"Successfully deleted {len(volumes_to_delete)} volumes for project: {project_name}"
        )
    else:
        print(f"Failed to delete volumes. Error: {stderr}")
    returncode, stdout, stderr = _run_command("docker network ls --format '{{.Name}}'")

    if returncode != 0:
        print(f"Failed to list Docker networks. Error: {stderr}")
        return

    networks = stdout.splitlines()

    # Filter networks by project name
    networks_to_delete = [n for n in networks if run_suffix in n]

    if not networks_to_delete:
        print(f"No networks found containing suffix: {run_suffix}")
    else:
        # Delete filtered networks
        network_names = " ".join(networks_to_delete)
        returncode, _, stderr = _run_command(f"docker network rm {network_names}")

        if returncode == 0:
            print(
                f"Successfully deleted {len(networks_to_delete)} networks containing suffix: {run_suffix}"
            )
        else:
            print(f"Failed to delete networks. Error: {stderr}")


@retry(tries=5, delay=5, backoff=2)
def get_server_host_port(container_name: str, suffix: str, client_port: str) -> str:
    returncode, stdout, stderr = _run_command("docker ps -a --format '{{json .}}'")
    if returncode != 0:
        raise RuntimeError(
            f"No container found containing: {container_name} and {suffix}"
        )

    containers = [json.loads(line) for line in stdout.splitlines()]
    api_server_json = None

    for container in containers:
        if container_name in container["Names"] and suffix in container["Names"]:
            api_server_json = container

    if not api_server_json:
        raise RuntimeError(
            f"No container found containing: {container_name} and {suffix}"
        )

    ports = api_server_json.get("Ports", "")
    port_infos = ports.split(",") if ports else []
    port_dict = {}
    for port_info in port_infos:
        port_arr = port_info.split(":")[-1].split("->") if port_info else []
        if len(port_arr) == 2:
            port_dict[port_arr[1]] = port_arr[0]

    # Find the host port where client_port is in the key
    matching_ports = [value for key, value in port_dict.items() if client_port in key]

    if matching_ports:
        return matching_ports[0]
    else:
        raise RuntimeError(
            f"No port found containing: {client_port} for container: {container_name} and suffix: {suffix}"
        )
