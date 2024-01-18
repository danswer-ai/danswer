from datetime import timezone
from typing import Any

from dropbox import Dropbox  # type: ignore
from dropbox.exceptions import ApiError
from dropbox.files import FileMetadata
from dropbox.files import FolderMetadata

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section


class DropboxClientNotSetUpError(PermissionError):
    def __init__(self) -> None:
        super().__init__("Dropbox Client is not set up, was load_credentials called?")


class DropboxConnector(LoadConnector, PollConnector):
    def __init__(self, batch_size: int = INDEX_BATCH_SIZE) -> None:
        self.batch_size = batch_size
        self.dropbox_client: Dropbox | None = None

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.dropbox_client = Dropbox(credentials["dropbox_access_token"])
        return None

    def _download_file(self, path: str) -> bytes:
        """Download a single file from Dropbox."""
        if self.dropbox_client is None:
            raise DropboxClientNotSetUpError()
        _, resp = self.dropbox_client.files_download(path)
        return resp.content

    def _get_shared_link(self, path: str) -> str:
        """Create a shared link for a file in Dropbox."""
        if self.dropbox_client is None:
            raise DropboxClientNotSetUpError()
        try:
            link_metadata = (
                self.dropbox_client.sharing_create_shared_link_with_settings(path)
            )
            return link_metadata.url
        except ApiError as err:
            print(f"Failed to create a shared link for {path}: {err}")
            return ""

    def _yield_files_recursive(
        self,
        path: str,
        start: SecondsSinceUnixEpoch | None,
        end: SecondsSinceUnixEpoch | None,
    ) -> GenerateDocumentsOutput:
        """Yield files in batches from a specified Dropbox folder, including subfolders."""
        if self.dropbox_client is None:
            raise DropboxClientNotSetUpError()

        result = self.dropbox_client.files_list_folder(
            path,
            limit=self.batch_size,
            recursive=False,
            include_non_downloadable_files=False,
        )

        while True:
            batch: list[Document] = []
            for entry in result.entries:
                if isinstance(entry, FileMetadata):
                    modified_time = entry.client_modified
                    if modified_time.tzinfo is None:
                        # If no timezone info, assume it is UTC
                        modified_time = modified_time.replace(tzinfo=timezone.utc)
                    else:
                        # If not in UTC, translate it
                        modified_time = modified_time.astimezone(timezone.utc)

                    time_as_seconds = int(modified_time.timestamp())
                    if start and time_as_seconds < start:
                        continue
                    if end and time_as_seconds > end:
                        continue

                    downloaded_file = self._download_file(entry.path_display)
                    link = self._get_shared_link(entry.path_display)
                    try:
                        text = downloaded_file.decode("utf-8")
                        batch.append(
                            Document(
                                id=f"doc:{entry.id}",
                                sections=[Section(link=link, text=text)],
                                source=DocumentSource.DROPBOX,
                                semantic_identifier=entry.name,
                                doc_updated_at=modified_time,
                                metadata={"type": "article"},
                            )
                        )
                    except Exception as e:
                        print(
                            f"Error decoding file {entry.path_display} as utf-8 error occurred: {e}"
                        )

                elif isinstance(entry, FolderMetadata):
                    yield from self._yield_files_recursive(entry.path_lower, start, end)

            if batch:
                yield batch

            if not result.has_more:
                break

            result = self.dropbox_client.files_list_folder_continue(result.cursor)

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self.poll_source(None, None)

    def poll_source(
        self, start: SecondsSinceUnixEpoch | None, end: SecondsSinceUnixEpoch | None
    ) -> GenerateDocumentsOutput:
        if self.dropbox_client is None:
            raise DropboxClientNotSetUpError()

        for batch in self._yield_files_recursive("", start, end):
            yield batch

        return None


if __name__ == "__main__":
    import os

    connector = DropboxConnector(batch_size=5)
    connector.load_credentials(
        {
            "dropbox_access_token": os.environ["DROPBOX_ACCESS_TOKEN"],
        }
    )
    document_batches = connector.load_from_state()
    for doc_batch in connector.load_from_state():
        for doc in doc_batch:
            print(doc)
