import base64
from datetime import datetime
from datetime import timedelta
from datetime import timezone
from typing import Any

import requests

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger


logger = setup_logger()

GONG_BASE_URL = "https://us-34014.api.gong.io"


class GongConnector(LoadConnector):
    def __init__(
        self, batch_size: int = INDEX_BATCH_SIZE, use_end_time: bool = False
    ) -> None:
        self.auth_token_basic: str | None = None
        self.batch_size: int = batch_size
        self.use_end_time = use_end_time

    def _get_auth_header(self) -> dict[str, str]:
        if self.auth_token_basic is None:
            raise ConnectorMissingCredentialError("Gong")

        return {"Authorization": f"Basic {self.auth_token_basic}"}

    def _get_transcript_batches(
        self, start_datetime: str = None, end_datetime: str = None
    ) -> list[str]:
        url = f"{GONG_BASE_URL}/v2/calls/transcript"
        body = {"filter": {}}
        if start_datetime:
            body["filter"]["fromDateTime"] = start_datetime
        if end_datetime:
            body["filter"]["toDateTime"] = end_datetime

        # The batch_ids in the previous method appears to be batches of call_ids to process
        # In this method, we will retrieve transcripts for them in batches.
        transcripts = []
        while True:
            response = requests.post(url, headers=self._get_auth_header(), json=body)
            response.raise_for_status()

            data = response.json()
            call_transcripts = data.get("callTranscripts", [])
            transcripts.extend(call_transcripts)

            while len(transcripts) >= self.batch_size:
                yield transcripts[: self.batch_size]
                transcripts = transcripts[self.batch_size :]

            cursor = data.get("records", {}).get("cursor")
            if cursor:
                body["cursor"] = cursor
            else:
                break

        if transcripts:
            yield transcripts

    def _fetch_call_details_by_id(self, call_id):
        url = f"{GONG_BASE_URL}/v2/calls/{call_id}"
        response = requests.get(url, headers=self._get_auth_header())
        response.raise_for_status()

        return response.json().get("call")

    def _fetch_calls(
        self, start_datetime: str = None, end_datetime: str = None
    ) -> GenerateDocumentsOutput:
        for transcript_batch in self._get_transcript_batches(
            start_datetime, end_datetime
        ):
            doc_batch: list[Document] = []

            for transcript in transcript_batch:
                call_id = transcript.get("callId")

                call_details = self._fetch_call_details_by_id(call_id)

                contents = transcript.get("transcript")
                speaker_to_anon_name: dict[str, str] = {}

                transcript_text = ""
                if call_details["purpose"]:
                    transcript_text += (
                        f"Call Description: {call_details['purpose']}\n\n"
                    )

                for segment in contents:
                    speaker_id = segment.get("speaker_id", "")
                    if speaker_id not in speaker_to_anon_name:
                        speaker_to_anon_name[
                            speaker_id
                        ] = f"User {len(speaker_to_anon_name) + 1}"
                    speaker_name = speaker_to_anon_name[speaker_id]

                    sentences = segment.get("sentences", {})
                    monolog = " ".join(
                        [sentence.get("text", "") for sentence in sentences]
                    )
                    transcript_text += f"{speaker_name}: {monolog}\n\n"

                doc_batch.append(
                    Document(
                        id=call_id,
                        sections=[
                            Section(link=call_details["url"], text=transcript_text)
                        ],
                        source=DocumentSource.GONG,
                        semantic_identifier=call_details["title"],
                        metadata={"Start Time": call_details["started"]},
                    )
                )
            yield doc_batch

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        combined = (
            f'{credentials["gong_access_key"]}:{credentials["gong_access_key_secret"]}'
        )
        self.auth_token_basic = base64.b64encode(combined.encode("utf-8")).decode(
            "utf-8"
        )
        return None

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._fetch_calls()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        # Because these are meeting start times, the meeting needs to end and be processed
        # so adding a 1 day buffer and fetching by default till current time
        start_datetime = datetime.fromtimestamp(start, tz=timezone.utc)
        start_one_day_offset = start_datetime - timedelta(days=1)
        start_time = start_one_day_offset.isoformat()
        end_time = (
            datetime.fromtimestamp(end, tz=timezone.utc).isoformat()
            if self.use_end_time
            else None
        )

        return self._fetch_calls(start_time, end_time)


if __name__ == "__main__":
    import os

    connector = GongConnector()
    connector.load_credentials(
        {
            "gong_access_key": os.environ["GONG_ACCESS_KEY"],
            "gong_access_key_secret": os.environ["GONG_ACCESS_KEY_SECRET"],
        }
    )
    document_batches = connector.load_from_state()
    print(next(document_batches))
