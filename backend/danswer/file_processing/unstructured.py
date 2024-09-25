from typing import Any
from typing import IO

from backend.danswer.configs.app_configs import UNSTRUCTURED_API_KEY
from unstructured.staging.base import dict_to_elements
from unstructured_client import UnstructuredClient
from unstructured_client.models import operations
from unstructured_client.models import shared

from danswer.utils.logger import setup_logger


logger = setup_logger()
unstructured_client = UnstructuredClient(api_key_auth=UNSTRUCTURED_API_KEY)


def _sdk_partition_request(
    file: IO[Any], file_name: str, **kwargs
) -> operations.PartitionRequest:
    try:
        request = operations.PartitionRequest(
            partition_parameters=shared.PartitionParameters(
                files=shared.Files(content=file.read(), file_name=file_name),
                **kwargs,
            ),
        )
        logger.debug(f"Partition request created successfully for file: {file_name}")
        return request
    except Exception as e:
        logger.error(f"Error creating partition request for file {file_name}: {str(e)}")
        raise


def unstructured_to_text(file: IO[Any], file_name: str) -> str:
    logger.debug(f"Starting to read file: {file_name}")
    req = _sdk_partition_request(file, file_name, strategy="auto")

    response = unstructured_client.general.partition(req)  # type: ignore
    elements = dict_to_elements(response.elements)

    if response.status_code != 200:
        err = f"Received unexpected status code {response.status_code} from Unstructured API."
        logger.error(err)
        raise ValueError(err)

    return "\n\n".join(str(el) for el in elements)
