import io
import os
import tempfile
from datetime import datetime
from datetime import timezone
from typing import Any
from html.parser import HTMLParser

import docx  # type: ignore
import msal  # type: ignore
import openpyxl  # type: ignore
# import pptx  # type: ignore
from office365.graph_client import GraphClient  # type: ignore
from office365.teams.team import Team
from office365.teams.channels.channel import Channel
from office365.teams.chats.messages.message import ChatMessage
from office365.outlook.mail.item_body import ItemBody

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.cross_connector_utils.file_utils import is_text_file_extension
from danswer.connectors.cross_connector_utils.file_utils import read_pdf_file
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import BasicExpertInfo
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger

UNSUPPORTED_FILE_TYPE_CONTENT = ""  # idea copied from the google drive side of things


logger = setup_logger()


class HTMLFilter(HTMLParser):
    text = ""
    def handle_data(self, data):
        self.text += data

def get_created_datetime(obj: ChatMessage):
    # Extract the 'createdDateTime' value from the 'properties' dictionary
    created_datetime_str = obj.properties['createdDateTime']
    
    # Convert the string to a datetime object
    return datetime.strptime(created_datetime_str, '%Y-%m-%dT%H:%M:%S.%f%z')


class TeamsConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        batch_size: int = INDEX_BATCH_SIZE,
        teams: list[str] = [],
    ) -> None:
        self.batch_size = batch_size
        self.graph_client: GraphClient | None = None
        self.requested_team_list: list[str] = teams

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        aad_client_id = credentials["aad_client_id"]
        aad_client_secret = credentials["aad_client_secret"]
        aad_directory_id = credentials["aad_directory_id"]

        def _acquire_token_func() -> dict[str, Any]:
            """
            Acquire token via MSAL
            """
            authority_url = f"https://login.microsoftonline.com/{aad_directory_id}"
            app = msal.ConfidentialClientApplication(
                authority=authority_url,
                client_id=aad_client_id,
                client_credential=aad_client_secret,
            )
            token = app.acquire_token_for_client(
                scopes=["https://graph.microsoft.com/.default"]
            )
            return token

        self.graph_client = GraphClient(_acquire_token_func)
        return None
    
    def get_message_list_from_channel(self, channel_object: Channel) -> list[ChatMessage]:
        message_list: list[ChatMessage] = []
        message_object_collection = channel_object.messages.get().execute_query()
        message_list.extend(message_object_collection)
        
        return message_list

    def get_all_channels(
        self,
        team_object_list: list[Team],
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> list[Channel]:
        filter_str = ""
        if start is not None and end is not None:
            filter_str = f"last_modified_datetime ge {start.isoformat()} and last_modified_datetime le {end.isoformat()}"

        channel_list: list[Channel] = []
        for team_object in team_object_list:
            query = team_object.channels.get()
            if filter_str:
                query = query.filter(filter_str)
            channel_objects = query.execute_query()
            channel_list.extend(channel_objects)

        return channel_list

    def get_all_teams_objects(self) -> list[Team]:
        team_object_list: list[Team] = []

        teams_object = self.graph_client.teams.get().execute_query()

        if len(self.requested_team_list) > 0:
            for requested_team in self.requested_team_list:
                adjusted_request_string = requested_team.replace(" ", "")
                for team_object in teams_object:
                    adjusted_team_string = team_object.display_name.replace(" ", "")
                    if adjusted_team_string == adjusted_request_string:
                        team_object_list.append(team_object)
        else:
            team_object_list.extend(teams_object)

        return team_object_list

    def _fetch_from_teams(
        self, start: datetime | None = None, end: datetime | None = None
    ) -> GenerateDocumentsOutput:
        if self.graph_client is None:
            raise ConnectorMissingCredentialError("Teams")

        team_object_list = self.get_all_teams_objects()

        channel_list = self.get_all_channels(
            team_object_list=team_object_list,
            start=start,
            end=end,
        )

        # goes over channels, converts them into Document objects and then yields them in batches
        doc_batch: list[Document] = []
        batch_count = 0
        for channel_object in channel_list:
            doc_batch.append(
                self.convert_channel_object_to_document(channel_object)
            )

            batch_count += 1
            if batch_count >= self.batch_size:
                yield doc_batch
                batch_count = 0
                doc_batch = []
        yield doc_batch

    def convert_channel_object_to_document(
        self,
        channel_object: Channel,
    ) -> Document:
        channel_text, most_recent_message_datetime = self.extract_channel_text_and_latest_datetime(channel_object)
        channel_members = self.extract_channel_members(channel_object)
        doc = Document(
            id=channel_object.id,
            sections=[Section(link=channel_object.web_url, text=channel_text)],
            source=DocumentSource.TEAMS,
            semantic_identifier=channel_object.properties["displayName"],
            doc_updated_at=most_recent_message_datetime,
            primary_owners=channel_members,
            metadata={},
        )
        return doc
    
    def extract_channel_members(self, channel_object: Channel)->list[BasicExpertInfo]:
        channel_members_list: list[BasicExpertInfo] = []
        member_objects = channel_object.members.get().execute_query()
        for member_object in member_objects:
            channel_members_list.append(
                BasicExpertInfo(display_name=member_object.display_name)
            )
        return channel_members_list
    
    def extract_channel_text_and_latest_datetime(self, channel_object: Channel):
        message_list = self.get_message_list_from_channel(channel_object)
        sorted_message_list = sorted(message_list, key=get_created_datetime, reverse=True)
        most_recent_datetime: datetime | None = None
        if sorted_message_list:
            most_recent_message = sorted_message_list[0]
            most_recent_datetime = datetime.strptime(most_recent_message.properties["createdDateTime"], 
                                                    '%Y-%m-%dT%H:%M:%S.%f%z')
        messages_text = ""
        for message in message_list:
            if message.body.content:
                html_parser = HTMLFilter()
                html_parser.feed(message.body.content)
                messages_text += html_parser.text

        return messages_text, most_recent_datetime

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._fetch_from_teams()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        start_datetime = datetime.utcfromtimestamp(start)
        end_datetime = datetime.utcfromtimestamp(end)
        return self._fetch_from_teams(start=start_datetime, end=end_datetime)


if __name__ == "__main__":
    connector = TeamsConnector(sites=os.environ["SITES"].split(","))

    connector.load_credentials(
        {
            "aad_client_id": os.environ["AAD_CLIENT_ID"],
            "aad_client_secret": os.environ["AAD_CLIENT_SECRET"],
            "aad_directory_id": os.environ["AAD_CLIENT_DIRECTORY_ID"],
        }
    )
    document_batches = connector.load_from_state()
    print(next(document_batches))
