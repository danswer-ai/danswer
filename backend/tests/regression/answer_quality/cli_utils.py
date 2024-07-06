import json
import os
import subprocess

from retry import retry


def _run_command(command: str) -> tuple[str, str]:
    process = subprocess.Popen(
        command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    stdout, stderr = process.communicate()
    if process.returncode != 0:
        raise RuntimeError(f"Command failed with error: {stderr.decode()}")
    return stdout.decode(), stderr.decode()


def get_current_commit_sha() -> str:
    print("Getting current commit SHA...")
    stdout, _ = _run_command("git rev-parse HEAD")
    sha = stdout.strip()
    print(f"Current commit SHA: {sha}")
    return sha


def switch_to_branch(branch: str) -> None:
    print(f"Switching to branch: {branch}...")
    _run_command(f"git checkout {branch}")
    _run_command("git pull")
    print(f"Successfully switched to branch: {branch}")
    print("Repository updated successfully.")


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
        env_vars["INDEXING_MODEL_SERVER_HOST"] = remote_server_ip

    for env_var_name, env_var in env_vars.items():
        os.environ[env_var_name] = env_var
        print(f"Set {env_var_name} to: {env_var}")


def start_docker_compose(
    run_suffix: str, launch_web_ui: bool, use_cloud_gpu: bool
) -> None:
    print("Starting Docker Compose...")
    os.chdir("../deployment/docker_compose")
    command = f"docker compose -f docker-compose.search-testing.yml -p danswer-stack{run_suffix} up -d"
    command += " --build"
    command += " --force-recreate"
    if not launch_web_ui:
        command += " --scale web_server=0"
        command += " --scale nginx=0"
    if use_cloud_gpu:
        command += " --scale indexing_model_server=0"
        command += " --scale inference_model_server=0"

    print("Docker Command:\n", command)

    _run_command(command)
    print("The Docker has been Composed :)")


def cleanup_docker(run_suffix: str) -> None:
    print(
        f"Deleting Docker containers, volumes, and networks for project suffix: {run_suffix}"
    )

    stdout, _ = _run_command("docker ps -a --format '{{json .}}'")

    containers = [json.loads(line) for line in stdout.splitlines()]

    project_name = f"danswer-stack{run_suffix}"
    containers_to_delete = [
        c for c in containers if c["Names"].startswith(project_name)
    ]

    if not containers_to_delete:
        print(f"No containers found for project: {project_name}")
    else:
        container_ids = " ".join([c["ID"] for c in containers_to_delete])
        _run_command(f"docker rm -f {container_ids}")

        print(
            f"Successfully deleted {len(containers_to_delete)} containers for project: {project_name}"
        )

    stdout, _ = _run_command("docker volume ls --format '{{.Name}}'")

    volumes = stdout.splitlines()

    volumes_to_delete = [v for v in volumes if v.startswith(project_name)]

    if not volumes_to_delete:
        print(f"No volumes found for project: {project_name}")
        return

    # Delete filtered volumes
    volume_names = " ".join(volumes_to_delete)
    _run_command(f"docker volume rm {volume_names}")

    print(
        f"Successfully deleted {len(volumes_to_delete)} volumes for project: {project_name}"
    )
    stdout, _ = _run_command("docker network ls --format '{{.Name}}'")

    networks = stdout.splitlines()

    networks_to_delete = [n for n in networks if run_suffix in n]

    if not networks_to_delete:
        print(f"No networks found containing suffix: {run_suffix}")
    else:
        network_names = " ".join(networks_to_delete)
        _run_command(f"docker network rm {network_names}")

        print(
            f"Successfully deleted {len(networks_to_delete)} networks containing suffix: {run_suffix}"
        )


@retry(tries=5, delay=5, backoff=2)
def get_api_server_host_port(suffix: str) -> str:
    """
    This pulls all containers with the provided suffix
    It then grabs the JSON specific container with a name containing "api_server"
    It then grabs the port info from the JSON and strips out the relevent data
    """
    container_name = "api_server"

    stdout, _ = _run_command("docker ps -a --format '{{json .}}'")
    containers = [json.loads(line) for line in stdout.splitlines()]
    server_jsons = []

    for container in containers:
        if container_name in container["Names"] and suffix in container["Names"]:
            server_jsons.append(container)

    if not server_jsons:
        raise RuntimeError(
            f"No container found containing: {container_name} and {suffix}"
        )
    elif len(server_jsons) > 1:
        raise RuntimeError(
            f"Too many containers matching {container_name} found, please indicate a suffix"
        )
    server_json = server_jsons[0]

    # This is in case the api_server has multiple ports
    client_port = "8080"
    ports = server_json.get("Ports", "")
    port_infos = ports.split(",") if ports else []
    port_dict = {}
    for port_info in port_infos:
        port_arr = port_info.split(":")[-1].split("->") if port_info else []
        if len(port_arr) == 2:
            port_dict[port_arr[1]] = port_arr[0]

    # Find the host port where client_port is in the key
    matching_ports = [value for key, value in port_dict.items() if client_port in key]

    if len(matching_ports) > 1:
        raise RuntimeError(f"Too many ports matching {client_port} found")
    if not matching_ports:
        raise RuntimeError(
            f"No port found containing: {client_port} for container: {container_name} and suffix: {suffix}"
        )
    return matching_ports[0]
