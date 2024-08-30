import requests

from danswer.utils.logger import setup_logger
from shared_configs.configs import MODEL_SERVER_HOST
from shared_configs.configs import MODEL_SERVER_PORT

logger = setup_logger()


def gpu_status_request(indexing: bool = False) -> bool:
    model_server_url = f"{MODEL_SERVER_HOST}:{MODEL_SERVER_PORT}"

    if "http" not in model_server_url:
        model_server_url = f"http://{model_server_url}"

    response = requests.get(f"{model_server_url}/api/gpu-status")

    if response.status_code == 200:
        gpu_status = response.json()
        if gpu_status["gpu_available"]:
            return True
        else:
            return False
    else:
        logger.warning(
            f"Error: Unable to fetch GPU status. Status code: {response.status_code}"
        )
    return False
