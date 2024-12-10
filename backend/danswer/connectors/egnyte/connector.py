import os
from datetime import datetime
from datetime import timezone
from typing import Any

import requests

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import OAuthConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.utils.logger import setup_logger
from danswer.utils.special_types import JSON_ro


logger = setup_logger()

_EGNYTE_LOCALHOST_OVERRIDE = os.getenv("EGNYTE_LOCALHOST_OVERRIDE")
_EGNYTE_DOMAIN = os.getenv("EGNYTE_DOMAIN")
_EGNYTE_CLIENT_ID = os.getenv("EGNYTE_CLIENT_ID")
_EGNYTE_CLIENT_SECRET = os.getenv("EGNYTE_CLIENT_SECRET")

_EGNYTE_API_BASE = "https://{domain}.egnyte.com/pubapi/v1"
_TIMEOUT = 60


class EgnyteConnector(LoadConnector, PollConnector, OAuthConnector):
    def __init__(
        self,
        domain: str | None = None,
        folder_path: str | None = None,
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.domain = domain
        self.folder_path = folder_path or "/"  # Root folder if not specified
        self.batch_size = batch_size
        self.access_token: str | None = None

    @classmethod
    def oauth_id(cls) -> str:
        return "egnyte"

    @classmethod
    def redirect_uri(cls, base_domain: str) -> str:
        if not _EGNYTE_CLIENT_ID:
            raise ValueError("EGNYTE_CLIENT_ID environment variable must be set")
        if not _EGNYTE_DOMAIN:
            raise ValueError("EGNYTE_DOMAIN environment variable must be set")

        if _EGNYTE_LOCALHOST_OVERRIDE:
            base_domain = _EGNYTE_LOCALHOST_OVERRIDE

        callback_uri = f"{base_domain.strip('/')}/connector/oauth/callback/egnyte"
        return (
            f"https://{_EGNYTE_DOMAIN}.egnyte.com/puboauth/token"
            f"?client_id={_EGNYTE_CLIENT_ID}"
            f"&redirect_uri={callback_uri}"
            f"&scope=Egnyte.filesystem"
            # f"&state=danswer"
            f"&response_type=code"
        )

    @classmethod
    def code_to_token(cls, code: str) -> JSON_ro:
        pass

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.domain = credentials["domain"]
        self.access_token = credentials["access_token"]
        return None

    def _get_files_list(
        self,
        path: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
    ) -> list[dict[str, Any]]:
        if not self.access_token or not self.domain:
            raise ConnectorMissingCredentialError("Egnyte")

        headers = {
            "Authorization": f"Bearer {self.access_token}",
        }

        params: dict[str, Any] = {
            "list_content": True,
            "folder_id": path,
        }

        if start_time:
            params["last_modified_after"] = start_time.isoformat()
        if end_time:
            params["last_modified_before"] = end_time.isoformat()

        url = f"{_EGNYTE_API_BASE.format(domain=self.domain)}/fs"
        response = requests.get(url, headers=headers, params=params, timeout=_TIMEOUT)

        if not response.ok:
            raise RuntimeError(f"Failed to fetch files from Egnyte: {response.text}")

        return response.json().get("files", [])

    def _process_files(
        self,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
    ) -> GenerateDocumentsOutput:
        files = self._get_files_list(self.folder_path, start_time, end_time)

        current_batch: list[Document] = []
        for file in files:
            if not file["is_folder"]:
                try:
                    # Get file content
                    headers = {
                        "Authorization": f"Bearer {self.access_token}",
                    }
                    url = f"{_EGNYTE_API_BASE.format(domain=self.domain)}/fs-content/{file['path']}"
                    response = requests.get(url, headers=headers, timeout=_TIMEOUT)

                    if not response.ok:
                        logger.error(f"Failed to fetch file content: {file['path']}")
                        continue

                    # doc = process_file(
                    #     file_name=file["name"],
                    #     file_data=response.content,
                    #     source=DocumentSource.EGNYTE,
                    #     url=file.get("url", ""),
                    #     metadata={
                    #         "folder_path": os.path.dirname(file["path"]),
                    #         "size": file.get("size", 0),
                    #         "last_modified": file.get("last_modified", ""),
                    #     },
                    # )
                    # TOOD: Implement this
                    doc = None

                    if doc is not None:
                        current_batch.append(doc)

                        if len(current_batch) >= self.batch_size:
                            yield current_batch
                            current_batch = []

                except Exception as e:
                    logger.error(f"Failed to process file {file['path']}: {str(e)}")
                    continue

        if current_batch:
            yield current_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        yield from self._process_files()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        start_time = datetime.fromtimestamp(start, tz=timezone.utc)
        end_time = datetime.fromtimestamp(end, tz=timezone.utc)

        yield from self._process_files(start_time=start_time, end_time=end_time)


if __name__ == "__main__":
    connector = EgnyteConnector()
    connector.load_credentials(
        {
            "domain": os.environ["EGNYTE_DOMAIN"],
            "access_token": os.environ["EGNYTE_ACCESS_TOKEN"],
        }
    )
    document_batches = connector.load_from_state()
    print(next(document_batches))
