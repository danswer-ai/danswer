import requests
from retry import retry

from danswer.configs.constants import DocumentSource
from danswer.connectors.models import InputType
from danswer.server.documents.models import ConnectorBase
from tests.regression.answer_quality.cli_utils import (
    api_url_builder,
)


def _run_cc_once(run_suffix: str, connector_id: int, credential_id: int) -> None:
    url = api_url_builder(run_suffix, "/manage/admin/connector/run-once/")
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


def _create_cc_pair(run_suffix: str, connector_id: int, credential_id: int) -> None:
    url = api_url_builder(
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


def _create_connector(run_suffix: str, file_paths: list[str]) -> int:
    url = api_url_builder(run_suffix, "/manage/admin/connector")
    headers = {
        "Content-Type": "application/json",
    }

    connector = ConnectorBase(
        name="ZipConnector_2",
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


def _create_credential(run_suffix: str) -> int:
    url = api_url_builder(run_suffix, "/manage/credential")
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
def _upload_file(run_suffix: str, zip_file_path: str) -> list[str]:
    files = [
        ("files", open(zip_file_path, "rb")),
    ]

    api_path = api_url_builder(run_suffix, "/manage/admin/connector/file/upload")
    try:
        response = requests.post(api_path, files=files)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        print("file uploaded successfully:", response.json())
        return response.json()["file_paths"]
    except Exception as e:
        print("File upload failed, trying file upload again")
        raise e


def upload_test_files(zip_file_path: str, run_suffix: str) -> None:
    print("zip:", zip_file_path)
    file_paths = _upload_file(run_suffix, zip_file_path)

    conn_id = _create_connector(run_suffix, file_paths)
    cred_id = _create_credential(run_suffix)

    _create_cc_pair(run_suffix, conn_id, cred_id)
    _run_cc_once(run_suffix, conn_id, cred_id)


if __name__ == "__main__":
    file_location = "/Users/danswer/testdocuments/20240628_source_documents.zip"
    # file_location = "/Users/danswer/testdocuments/Introduction - Danswer Documentation.html"
    run_suffix = ""
    upload_test_files(file_location, run_suffix)
