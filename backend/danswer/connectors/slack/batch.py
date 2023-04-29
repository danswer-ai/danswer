import json
import os
from collections.abc import Generator
from pathlib import Path
from typing import Any
from typing import cast

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.connectors.slack.utils import get_message_link
from danswer.connectors.type_aliases import BatchLoader


def _process_batch_event(
    event: dict[str, Any],
    matching_doc: Document | None,
    workspace: str | None = None,
    channel_id: str | None = None,
) -> Document | None:
    if event["type"] == "message" and event.get("subtype") != "channel_join":
        if matching_doc:
            return Document(
                id=matching_doc.id,
                sections=matching_doc.sections
                + [
                    Section(
                        link=get_message_link(
                            event, workspace=workspace, channel_id=channel_id
                        ),
                        text=event["text"],
                    )
                ],
                metadata=matching_doc.metadata,
            )

        return Document(
            id=event["ts"],
            sections=[
                Section(
                    link=get_message_link(
                        event, workspace=workspace, channel_id=channel_id
                    ),
                    text=event["text"],
                )
            ],
            metadata={},
        )

    return None


class BatchSlackLoader(BatchLoader):
    def __init__(
        self, export_path_str: str, batch_size: int = INDEX_BATCH_SIZE
    ) -> None:
        self.export_path_str = export_path_str
        self.batch_size = batch_size

    def load(self) -> Generator[list[Document], None, None]:
        export_path = Path(self.export_path_str)

        with open(export_path / "channels.json") as f:
            channels = json.load(f)

        document_batch: dict[str, Document] = {}
        for channel_info in channels:
            channel_dir_path = export_path / cast(str, channel_info["name"])
            channel_file_paths = [
                channel_dir_path / file_name
                for file_name in os.listdir(channel_dir_path)
            ]
            for path in channel_file_paths:
                with open(path) as f:
                    events = cast(list[dict[str, Any]], json.load(f))
                for event in events:
                    doc = _process_batch_event(
                        event,
                        document_batch.get(event.get("thread_ts", "")),
                        channel_id=channel_info["id"],
                    )
                    if doc:
                        document_batch[doc.id] = doc
                        if len(document_batch) >= self.batch_size:
                            yield list(document_batch.values())

        yield list(document_batch.values())
