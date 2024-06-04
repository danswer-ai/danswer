import os
from datetime import datetime
from html.parser import HTMLParser
from typing import Any

import msal  # type: ignore
from office365.graph_client import GraphClient  # type: ignore
from office365.teams.channels.channel import Channel  # type: ignore
from office365.teams.chats.messages.message import ChatMessage  # type: ignore
from office365.teams.team import Team  # type: ignore

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

# import pptx  # type: ignore

logger = setup_logger()


class HTMLFilter(HTMLParser):
    text = ""

    def handle_data(self, data: str) -> None:
        self.text += data


def get_created_datetime(obj: ChatMessage) -> datetime:
    # Extract the 'createdDateTime' value from the 'properties' dictionary
    created_datetime_str = obj.properties["createdDateTime"]

    # Convert the string to a datetime object
    return datetime.strptime(created_datetime_str, "%Y-%m-%dT%H:%M:%S.%f%z")


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
        teams_client_id = credentials["teams_client_id"]
        teams_client_secret = credentials["teams_client_secret"]
        teams_directory_id = credentials["teams_directory_id"]

        def _acquire_token_func() -> dict[str, Any]:
            """
            Acquire token via MSAL
            """
            authority_url = f"https://login.microsoftonline.com/{teams_directory_id}"
            app = msal.ConfidentialClientApplication(
                authority=authority_url,
                client_id=teams_client_id,
                client_credential=teams_client_secret,
            )
            token = app.acquire_token_for_client(
                scopes=["https://graph.microsoft.com/.default"]
            )
            return token

        self.graph_client = GraphClient(_acquire_token_func)
        return None

    def get_post_message_lists_from_channel(
        self, channel_object: Channel
    ) -> list[list[ChatMessage]]:
        base_message_list: list[
            ChatMessage
        ] = channel_object.messages.get().execute_query()

        post_message_lists: list[list[ChatMessage]] = []
        for message in base_message_list:
            replies = message.replies.get_all().execute_query()

            post_message_list: list[ChatMessage] = [message]
            post_message_list.extend(replies)

            post_message_lists.append(post_message_list)

        return post_message_lists

    def get_channel_object_list_from_team_list(
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

    def get_all_team_objects(self) -> list[Team]:
        if self.graph_client is None:
            raise ConnectorMissingCredentialError("Teams")

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

        team_object_list = self.get_all_team_objects()

        channel_list = self.get_channel_object_list_from_team_list(
            team_object_list=team_object_list,
            start=start,
            end=end,
        )

        # goes over channels, converts them into Document objects and then yields them in batches
        doc_batch: list[Document] = []
        batch_count = 0
        for channel_object in channel_list:
            post_message_lists = self.get_post_message_lists_from_channel(
                channel_object
            )
            for base_message_groups in post_message_lists:
                doc_batch.append(
                    self.convert_post_message_list_to_document(
                        channel_object, base_message_groups
                    )
                )

            batch_count += 1
            if batch_count >= self.batch_size:
                yield doc_batch
                batch_count = 0
                doc_batch = []
        yield doc_batch

    def convert_post_message_list_to_document(
        self,
        channel_object: Channel,
        post_message_list: list[ChatMessage],
    ) -> Document:
        most_recent_message_datetime: datetime | None = None
        semantic_string: str = (
            "Channel/Post: " + channel_object.properties["displayName"]
        )
        post_id: str = channel_object.id
        web_url: str = channel_object.web_url
        messages_text = ""
        post_members_list: list[BasicExpertInfo] = []

        sorted_post_message_list = sorted(
            post_message_list, key=get_created_datetime, reverse=True
        )

        if sorted_post_message_list:
            most_recent_message = sorted_post_message_list[0]
            most_recent_message_datetime = datetime.strptime(
                most_recent_message.properties["createdDateTime"],
                "%Y-%m-%dT%H:%M:%S.%f%z",
            )

        for message in post_message_list:
            # add text and a newline
            if message.body.content:
                html_parser = HTMLFilter()
                html_parser.feed(message.body.content)
                messages_text += html_parser.text + "\n"

            # if it has a subject, that means its the top level post message, so grab its id, url, and subject
            if message.properties["subject"]:
                semantic_string += "/" + message.properties["subject"]
                post_id = message.properties["id"]
                web_url = message.web_url

            # check to make sure there is a valid display name
            if message.properties["from"]:
                if message.properties["from"]["user"]:
                    if message.properties["from"]["user"]["displayName"]:
                        message_sender = message.properties["from"]["user"][
                            "displayName"
                        ]
                        # if its not a duplicate, add it to the list
                        if message_sender not in [
                            member.display_name for member in post_members_list
                        ]:
                            post_members_list.append(
                                BasicExpertInfo(display_name=message_sender)
                            )

        # if there are no found post members, grab the members from the parent channel
        if not post_members_list:
            post_members_list = self.extract_channel_members(channel_object)

        doc = Document(
            id=post_id,
            sections=[Section(link=web_url, text=messages_text)],
            source=DocumentSource.TEAMS,
            semantic_identifier=semantic_string,
            doc_updated_at=most_recent_message_datetime,
            primary_owners=post_members_list,
            metadata={},
        )
        return doc

    def extract_channel_members(self, channel_object: Channel) -> list[BasicExpertInfo]:
        channel_members_list: list[BasicExpertInfo] = []
        member_objects = channel_object.members.get().execute_query()
        for member_object in member_objects:
            channel_members_list.append(
                BasicExpertInfo(display_name=member_object.display_name)
            )
        return channel_members_list

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._fetch_from_teams()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        start_datetime = datetime.utcfromtimestamp(start)
        end_datetime = datetime.utcfromtimestamp(end)
        return self._fetch_from_teams(start=start_datetime, end=end_datetime)


if __name__ == "__main__":
    connector = TeamsConnector(teams=os.environ["TEAMS"].split(","))

    connector.load_credentials(
        {
            "teams_client_id": os.environ["TEAMS_CLIENT_ID"],
            "teams_client_secret": os.environ["TEAMS_CLIENT_SECRET"],
            "teams_directory_id": os.environ["TEAMS_CLIENT_DIRECTORY_ID"],
        }
    )
    document_batches = connector.load_from_state()
    print(next(document_batches))
