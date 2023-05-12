import json
import os
from collections.abc import Generator
from pathlib import Path
from typing import Any
from typing import cast

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import PullLoader
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.connectors.slack.utils import get_message_link


def _process_batch_event(
    slack_event: dict[str, Any],
    channel: dict[str, Any],
    matching_doc: Document | None,
    workspace: str | None = None,
) -> Document | None:
    if (
        slack_event["type"] == "message"
        and slack_event.get("subtype") != "channel_join"
    ):
        if matching_doc:
            return Document(
                id=matching_doc.id,
                sections=matching_doc.sections
                + [
                    Section(
                        link=get_message_link(
                            slack_event, workspace=workspace, channel_id=channel["id"]
                        ),
                        text=slack_event["text"],
                    )
                ],
                source=matching_doc.source,
                semantic_identifier=matching_doc.semantic_identifier,
                metadata=matching_doc.metadata,
            )

        return Document(
            id=slack_event["ts"],
            sections=[
                Section(
                    link=get_message_link(
                        slack_event, workspace=workspace, channel_id=channel["id"]
                    ),
                    text=slack_event["text"],
                )
            ],
            source=DocumentSource.SLACK,
            semantic_identifier=channel["name"],
            metadata={},
        )

    return None


class BatchSlackLoader(PullLoader):
    """Loads from an unzipped slack workspace export"""

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
                for slack_event in events:
                    doc = _process_batch_event(
                        slack_event=slack_event,
                        channel=channel_info,
                        matching_doc=document_batch.get(
                            slack_event.get("thread_ts", "")
                        ),
                    )
                    if doc:
                        document_batch[doc.id] = doc
                        if len(document_batch) >= self.batch_size:
                            yield list(document_batch.values())

        yield list(document_batch.values())
