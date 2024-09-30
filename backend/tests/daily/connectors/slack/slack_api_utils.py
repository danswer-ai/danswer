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

from danswer.connectors.slack.connector import default_msg_filter
from danswer.connectors.slack.connector import get_channel_messages
from tests.integration.common_utils.test_models import DATestCredential


def _clear_slack_conversation_members(
    slack_client: WebClient, channel: dict[str, Any]
) -> None:
    channel_id = channel.get("id")
    members = slack_client.conversations_members(channel=channel_id)
    for member in members.get("members", []):
        try:
            slack_client.conversations_kick(channel=channel_id, user=member)
            print(f"Kicked member: {member}")
        except Exception as e:
            if "cant_kick_self" in str(e):
                continue
            print(f"Error kicking member: {e}")
            print(member)
    try:
        slack_client.conversations_unarchive(channel=channel.get("id"))
        channel["is_archived"] = False
    except Exception:
        # Channel is already unarchived
        pass


def _add_slack_conversation_members(
    slack_client: WebClient, channel: dict[str, Any], member_ids: list[str]
) -> None:
    for user_id in member_ids:
        slack_client.conversations_invite(channel=channel.get("id"), users=user_id)


def _clear_slack_conversation_chats(
    slack_client: WebClient, channel: dict[str, Any]
) -> None:
    message_batches = get_channel_messages(slack_client, channel)
    for message_batch in message_batches:
        for message in message_batch:
            if default_msg_filter(message):
                continue

            try:
                slack_client.chat_delete(
                    channel=channel.get("id"), ts=message.get("ts"), as_user=True
                )
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
        conversations = slack_client.conversations_list(
            exclude_archived=False, types=channel_types
        )
        for conversation in conversations.get("channels", []):
            _clear_slack_conversation_chats(slack_client, conversation)
            if not conversation.get("is_general", False):
                _clear_slack_conversation_members(slack_client, conversation)

        return conversations.get("channels", [])

    @staticmethod
    def seed_channel(
        slack_client: WebClient, channel_name: str, channels: list[dict[str, Any]]
    ) -> dict[str, Any]:
        for channel in channels:
            if channel_name in channel["name"]:
                if channel_name != channel["name"]:
                    slack_client.conversations_rename(
                        channel=channel.get("id"), name=channel_name
                    )
                    channel["name"] = channel_name
                print(f"Channel {channel_name} already exists")
                return channel

        print(f"Channel {channel_name} not found")
        if "public" in channel_name:
            channel = slack_client.conversations_create(
                name=channel_name, is_private=False
            )
        elif "private" in channel_name:
            channel = slack_client.conversations_create(
                name=channel_name, is_private=True
            )
        else:
            raise Exception(
                f"Channel name must contain 'public' or 'private': {channel_name}"
            )
        return channel["channel"]

    @staticmethod
    def build_slack_user_email_id_map(slack_client: WebClient) -> dict[str, str]:
        users = slack_client.users_list()
        user_email_id_map = {}
        for user in users.get("members", []):
            user_email_id_map[user.get("profile").get("email")] = user.get("id")
        return user_email_id_map

    @staticmethod
    def set_channel_members(
        slack_client: WebClient, channel: dict[str, Any], user_ids: list[str]
    ) -> None:
        _clear_slack_conversation_members(slack_client, channel)
        _add_slack_conversation_members(slack_client, channel, user_ids)

    @staticmethod
    def add_message_to_channel(
        slack_client: WebClient, channel: dict[str, Any], message: str, user_email: str
    ) -> None:
        slack_client.chat_postMessage(
            channel=channel.get("id"), text=message, as_user=True, username=user_email
        )
