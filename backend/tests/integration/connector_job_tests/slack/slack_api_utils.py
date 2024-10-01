"""
Assumptions:
- The test users have already been created
- General is the only channel
- General is empty of messages
- In addition to the normal slack oauth permissions, the following scopes are needed:
    - channels:manage
    - groups:write
    - chat:write
    - chat:write.public
"""
from typing import Any

from slack_sdk import WebClient

from danswer.connectors.slack.connector import ChannelType
from danswer.connectors.slack.connector import default_msg_filter
from danswer.connectors.slack.connector import get_channel_messages
from tests.integration.common_utils.test_models import DATestCredential


def _get_slack_channel_id(channel: dict[str, Any]) -> str:
    if not (channel_id := channel.get("id")):
        raise ValueError("Channel ID is missing")
    return channel_id


def _clear_slack_conversation_members(
    slack_client: WebClient, channel: dict[str, Any]
) -> None:
    channel_id = _get_slack_channel_id(channel)
    members_results = slack_client.conversations_members(channel=channel_id)
    member_ids: list[str] = members_results.get("members", [])
    for member_id in member_ids:
        try:
            slack_client.conversations_kick(channel=channel_id, user=member_id)
            print(f"Kicked member: {member_id}")
        except Exception as e:
            if "cant_kick_self" in str(e):
                continue
            print(f"Error kicking member: {e}")
            print(member_id)
    try:
        slack_client.conversations_unarchive(channel=channel_id)
        channel["is_archived"] = False
    except Exception:
        # Channel is already unarchived
        pass


def _add_slack_conversation_members(
    slack_client: WebClient, channel: dict[str, Any], member_ids: list[str]
) -> None:
    channel_id = _get_slack_channel_id(channel)
    for user_id in member_ids:
        slack_client.conversations_invite(channel=channel_id, users=user_id)


def _delete_slack_conversation_messages(
    slack_client: WebClient,
    channel: dict[str, Any],
    message_to_delete: str | None = None,
) -> None:
    channel_id = _get_slack_channel_id(channel)
    message_batches = get_channel_messages(slack_client, channel)
    for message_batch in message_batches:
        for message in message_batch:
            if default_msg_filter(message):
                continue

            if message_to_delete and message.get("text") != message_to_delete:
                continue

            try:
                if not (ts := message.get("ts")):
                    raise ValueError("Message timestamp is missing")
                slack_client.chat_delete(channel=channel_id, ts=ts, as_user=True)
            except Exception as e:
                print(f"Error deleting message: {e}")
                print(message)


class SlackManager:
    @staticmethod
    def get_slack_client(credential: DATestCredential) -> WebClient:
        return WebClient(token=credential.credential_json["slack_bot_token"])

    @staticmethod
    def reset_slack_workspace(slack_client: WebClient) -> list[dict[str, Any]]:
        # Remove all users from all channels
        channel_types = ["private_channel", "public_channel"]
        conversations_results = slack_client.conversations_list(
            exclude_archived=False, types=channel_types
        )
        conversations: list[ChannelType] = conversations_results.get("channels", [])
        for conversation in conversations:
            _delete_slack_conversation_messages(slack_client, conversation)
            if not conversation.get("is_general", False):
                _clear_slack_conversation_members(slack_client, conversation)

        return conversations

    @staticmethod
    def seed_channel(
        slack_client: WebClient, channel_name: str, channels: list[dict[str, Any]]
    ) -> dict[str, Any]:
        for channel in channels:
            if channel_name in channel["name"]:
                if channel_name != channel["name"]:
                    channel_id = _get_slack_channel_id(channel)
                    slack_client.conversations_rename(
                        channel=channel_id, name=channel_name
                    )
                    channel["name"] = channel_name
                print(f"Channel {channel_name} already exists")
                return channel

        print(f"Channel {channel_name} not found")
        if "public" in channel_name:
            created_channel = slack_client.conversations_create(
                name=channel_name, is_private=False
            )
        elif "private" in channel_name:
            created_channel = slack_client.conversations_create(
                name=channel_name, is_private=True
            )
        else:
            raise Exception(
                f"Channel name must contain 'public' or 'private': {channel_name}"
            )
        return created_channel["channel"]

    @staticmethod
    def build_slack_user_email_id_map(slack_client: WebClient) -> dict[str, str]:
        users_results = slack_client.users_list()
        users: list[dict[str, Any]] = users_results.get("members", [])
        user_email_id_map = {}
        for user in users:
            if not (email := user.get("profile", {}).get("email")):
                continue
            if not (user_id := user.get("id")):
                raise ValueError("User ID is missing")
            user_email_id_map[email] = user_id
        return user_email_id_map

    @staticmethod
    def set_channel_members(
        slack_client: WebClient, channel: dict[str, Any], user_ids: list[str]
    ) -> None:
        _clear_slack_conversation_members(slack_client, channel)
        _add_slack_conversation_members(slack_client, channel, user_ids)

    @staticmethod
    def add_message_to_channel(
        slack_client: WebClient, channel: dict[str, Any], message: str
    ) -> None:
        channel_id = _get_slack_channel_id(channel)
        slack_client.chat_postMessage(channel=channel_id, text=message)

    @staticmethod
    def remove_message_from_channel(
        slack_client: WebClient, channel: dict[str, Any], message: str
    ) -> None:
        _delete_slack_conversation_messages(slack_client, channel, message)
