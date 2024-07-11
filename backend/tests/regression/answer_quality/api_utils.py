import requests
from retry import retry

from danswer.configs.constants import DocumentSource
from danswer.configs.constants import MessageType
from danswer.connectors.models import InputType
from danswer.db.enums import IndexingStatus
from danswer.one_shot_answer.models import DirectQARequest
from danswer.one_shot_answer.models import ThreadMessage
from danswer.search.models import IndexFilters
from danswer.search.models import OptionalSearchSetting
from danswer.search.models import RetrievalDetails
from danswer.server.documents.models import ConnectorBase
from tests.regression.answer_quality.cli_utils import (
    get_api_server_host_port,
)


def _api_url_builder(run_suffix: str, api_path: str) -> str:
    return f"http://localhost:{get_api_server_host_port(run_suffix)}" + api_path


@retry(tries=5, delay=2, backoff=2)
def get_answer_from_query(query: str, run_suffix: str) -> tuple[list[str], str]:
    filters = IndexFilters(
        source_type=None,
        document_set=None,
        time_cutoff=None,
        tags=None,
        access_control_list=None,
    )

    messages = [ThreadMessage(message=query, sender=None, role=MessageType.USER)]

    new_message_request = DirectQARequest(
        messages=messages,
        prompt_id=0,
        persona_id=0,
        retrieval_options=RetrievalDetails(
            run_search=OptionalSearchSetting.ALWAYS,
            real_time=True,
            filters=filters,
            enable_auto_detect_filters=False,
        ),
        chain_of_thought=False,
        return_contexts=True,
    )

    url = _api_url_builder(run_suffix, "/query/answer-with-quote/")
    headers = {
        "Content-Type": "application/json",
    }

    body = new_message_request.dict()
    body["user"] = None
    try:
        response_json = requests.post(url, headers=headers, json=body).json()
        context_data_list = response_json.get("contexts", {}).get("contexts", [])
        answer = response_json.get("answer", "")
    except Exception as e:
        print("Failed to answer the questions, trying again")
        print(f"error: {str(e)}")
        raise e

    return context_data_list, answer


def check_if_query_ready(run_suffix: str) -> bool:
    url = _api_url_builder(run_suffix, "/manage/admin/connector/indexing-status/")
    headers = {
        "Content-Type": "application/json",
    }

    indexing_status_dict = requests.get(url, headers=headers).json()

    ongoing_index_attempts = False
    doc_count = 0
    for index_attempt in indexing_status_dict:
        status = index_attempt["last_status"]
        if status == IndexingStatus.IN_PROGRESS or status == IndexingStatus.NOT_STARTED:
            ongoing_index_attempts = True
        doc_count += index_attempt["docs_indexed"]

    if not doc_count:
        print("No docs indexed, waiting for indexing to start")
    elif ongoing_index_attempts:
        print(
            f"{doc_count} docs indexed but waiting for ongoing indexing jobs to finish..."
        )

    return doc_count > 0 and not ongoing_index_attempts


def run_cc_once(run_suffix: str, connector_id: int, credential_id: int) -> None:
    url = _api_url_builder(run_suffix, "/manage/admin/connector/run-once/")
    headers = {
        "Content-Type": "application/json",
    }

    body = {
        "connector_id": connector_id,
        "credential_ids": [credential_id],
        "from_beginning": True,
    }
    print("body:", body)
    response = requests.post(url, headers=headers, json=body)
    if response.status_code == 200:
        print("Connector created successfully:", response.json())
    else:
        print("Failed status_code:", response.status_code)
        print("Failed text:", response.text)


def create_cc_pair(run_suffix: str, connector_id: int, credential_id: int) -> None:
    url = _api_url_builder(
        run_suffix, f"/manage/connector/{connector_id}/credential/{credential_id}"
    )
    headers = {
        "Content-Type": "application/json",
    }

    body = {"name": "zip_folder_contents", "is_public": True}
    print("body:", body)
    response = requests.put(url, headers=headers, json=body)
    if response.status_code == 200:
        print("Connector created successfully:", response.json())
    else:
        print("Failed status_code:", response.status_code)
        print("Failed text:", response.text)


def _get_existing_connector_names(run_suffix: str) -> list[str]:
    url = _api_url_builder(run_suffix, "/manage/connector")
    headers = {
        "Content-Type": "application/json",
    }
    body = {
        "credential_json": {},
        "admin_public": True,
    }
    response = requests.get(url, headers=headers, json=body)
    if response.status_code == 200:
        connectors = response.json()
        return [connector["name"] for connector in connectors]
    else:
        raise RuntimeError(response.__dict__)


def create_connector(run_suffix: str, file_paths: list[str]) -> int:
    url = _api_url_builder(run_suffix, "/manage/admin/connector")
    headers = {
        "Content-Type": "application/json",
    }
    connector_name = base_connector_name = "search_eval_connector"
    existing_connector_names = _get_existing_connector_names(run_suffix)

    count = 1
    while connector_name in existing_connector_names:
        connector_name = base_connector_name + "_" + str(count)
        count += 1

    connector = ConnectorBase(
        name=connector_name,
        source=DocumentSource.FILE,
        input_type=InputType.LOAD_STATE,
        connector_specific_config={"file_locations": file_paths},
        refresh_freq=None,
        prune_freq=None,
        disabled=False,
    )

    body = connector.dict()
    print("body:", body)
    response = requests.post(url, headers=headers, json=body)
    if response.status_code == 200:
        print("Connector created successfully:", response.json())
        return response.json()["id"]
    else:
        raise RuntimeError(response.__dict__)


def create_credential(run_suffix: str) -> int:
    url = _api_url_builder(run_suffix, "/manage/credential")
    headers = {
        "Content-Type": "application/json",
    }
    body = {
        "credential_json": {},
        "admin_public": True,
    }
    response = requests.post(url, headers=headers, json=body)
    if response.status_code == 200:
        print("credential created successfully:", response.json())
        return response.json()["id"]
    else:
        raise RuntimeError(response.__dict__)


@retry(tries=10, delay=2, backoff=2)
def upload_file(run_suffix: str, zip_file_path: str) -> list[str]:
    files = [
        ("files", open(zip_file_path, "rb")),
    ]

    api_path = _api_url_builder(run_suffix, "/manage/admin/connector/file/upload")
    try:
        response = requests.post(api_path, files=files)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        print("file uploaded successfully:", response.json())
        return response.json()["file_paths"]
    except Exception as e:
        print("File upload failed, waiting for API server to come up and trying again")
        raise e
