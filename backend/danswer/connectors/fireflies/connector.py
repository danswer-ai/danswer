# TODO: Fix the transcript text parsing for the document
# TODO: Remove the host email from the secondary owners
# TODO: Figure out if to use semantic identifier or title
# TODO: Fix date parsing in graphql query
# TODO: Fix credentials loading
from collections.abc import Iterator
from datetime import datetime
from datetime import timezone
from typing import List

import requests

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import BasicExpertInfo
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger

logger = setup_logger()

_FIREFLIES_ID_PREFIX = "FIREFLIES_"

_FIREFLIES_API_URL = "https://api.fireflies.ai/graphql"

_FIREFLIES_API_HEADERS = {"Content-Type": "application/json", "Authorization": ""}


def _create_doc_from_transcript(transcript: dict) -> Document:
    meeting_text = ""
    sentences = transcript.get("sentences", [])
    meeting_text = str(sentences)
    # for sentence in sentences:
    #     meeting_text += (
    #         sentence.get("speaker_name", "Unknown Speaker")
    #         + ": "
    #         + sentence.get("text", "")
    #         + "\n\n"
    #     )

    link = transcript.get("transcript_url", "")

    id = _FIREFLIES_ID_PREFIX + transcript.get("id", "")

    title = transcript.get("title", "")

    meeting_date_unix = transcript.get("date", "")
    meeting_date = datetime.fromtimestamp(meeting_date_unix / 1000, tz=timezone.utc)

    meeting_host_email = [BasicExpertInfo(email=transcript.get("host_email", ""))]

    meeting_participants_emails = []
    for participant in transcript.get("participants", []):
        meeting_participants_emails.append(BasicExpertInfo(email=participant))

    return Document(
        id=id,
        sections=[
            Section(
                link=link,
                text=meeting_text,
            )
        ],
        source=DocumentSource.FIREFLIES,
        semantic_identifier=title,
        metadata={},
        doc_updated_at=meeting_date,
        primary_owners=meeting_host_email,
        secondary_owners=meeting_participants_emails,
    )


class FirefliesConnector(PollConnector, LoadConnector):
    def __init__(self, batch_size: int = INDEX_BATCH_SIZE) -> None:
        self.batch_size = batch_size

    def load_credentials(self, credentials: dict[str, str | int]) -> None:
        api_key = credentials.get("fireflies_api_key")

        if not isinstance(api_key, str):
            raise ConnectorMissingCredentialError(
                "The Fireflies API key must be a string"
            )

        self.api_key = str(api_key)

    def _fetch_transcripts(
        self, start: datetime | None = None, end: datetime | None = None
    ) -> Iterator[List[dict]]:
        if self.api_key is None:
            raise ConnectorMissingCredentialError("Missing API key")

        headers = _FIREFLIES_API_HEADERS.copy()
        headers["Authorization"] = "Bearer 790bc814-e2f8-4349-af78-2d0b5affdaa5"

        limit = 4
        skip = 0
        date_filters = ""
        if start:
            date_filters = f"fromDate: {start.isoformat()},"
        if end:
            date_filters += f"toDate: {end.isoformat()}"

        api_query = {
            "query": f"""
                query {{
                    transcripts(
                        limit: {limit},
                        skip: {skip}
                    ) {{
                        title
                        id
                        date
                        host_email
                        participants
                        transcript_url
                        sentences {{
                            text
                            speaker_name
                        }}
                    }}
                }}
            """
        }

        while True:
            response = requests.post(
                _FIREFLIES_API_URL, headers=headers, json=api_query
            )

            response.raise_for_status()

            if response.status_code == 204:
                break

            transcripts = response.json().get("data", {}).get("transcripts", [])

            if not transcripts:
                break

            yield transcripts

            if len(transcripts) < limit:
                break

            skip += limit

    def _process_transcripts(
        self, start: datetime | None = None, end: datetime | None = None
    ) -> GenerateDocumentsOutput:
        doc_batch: List[Document] = []

        for transcript_batch in self._fetch_transcripts(start, end):
            for transcript in transcript_batch:
                print(transcript)
                doc_batch.append(_create_doc_from_transcript(transcript))

                if len(doc_batch) >= self.batch_size:
                    yield doc_batch
                    doc_batch = []

        if doc_batch:
            yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._process_transcripts()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        start_datetime = datetime.fromtimestamp(start, tz=timezone.utc)
        end_datetime = datetime.fromtimestamp(end, tz=timezone.utc)

        yield from self._process_transcripts(start_datetime, end_datetime)
