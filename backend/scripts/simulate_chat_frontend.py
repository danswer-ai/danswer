# This file is purely for development use, not included in any builds
# Use this to test the chat feature with and without context.
# With context refers to being able to call out to Danswer and other tools (currently no other tools)
# Without context refers to only knowing the chat's own history with no additional information
# This script does not allow for branching logic that is supported by the backend APIs
# This script also does not allow for editing/regeneration of user/model messages
# Have Danswer API server running to use this.
import argparse
import json

import requests

from danswer.configs.app_configs import APP_PORT

LOCAL_CHAT_ENDPOINT = f"http://127.0.0.1:{APP_PORT}/chat/"


def create_new_session() -> int:
    response = requests.post(LOCAL_CHAT_ENDPOINT + "create-chat-session")
    response.raise_for_status()
    new_session_id = response.json()["chat_session_id"]
    return new_session_id


def send_chat_message(
    message: str,
    chat_session_id: int,
    message_number: int,
    parent_edit_number: int | None,
    persona_name: str | None,
) -> None:
    data = {
        "message": message,
        "chat_session_id": chat_session_id,
        "message_number": message_number,
        "parent_edit_number": parent_edit_number,
        "persona_name": persona_name,
    }

    docs: list[dict] | None = None
    with requests.post(
        LOCAL_CHAT_ENDPOINT + "send-message", json=data, stream=True
    ) as r:
        for json_response in r.iter_lines():
            response_text = json.loads(json_response.decode())
            new_token = response_text.get("answer_piece")
            if docs is None:
                docs = response_text.get("top_documents")
            if new_token:
                print(new_token, end="", flush=True)
        print()

    if docs:
        print("\nReference Docs:")
        for ind, doc in enumerate(docs, start=1):
            print(f"\t - Doc {ind}: {doc.get('semantic_identifier')}")


def run_chat(contextual: bool) -> None:
    try:
        new_session_id = create_new_session()
        print(f"Chat Session ID: {new_session_id}")
    except requests.exceptions.ConnectionError:
        print(
            "Looks like you haven't started the Danswer Backend server, please run the FastAPI server"
        )
        exit()

    persona_name = "Danswer" if contextual else None

    message_num = 0
    parent_edit = None
    while True:
        new_message = input(
            "\n\n----------------------------------\n"
            "Please provide a new chat message:\n> "
        )

        send_chat_message(
            new_message, new_session_id, message_num, parent_edit, persona_name
        )

        message_num += 2  # 1 for User message, 1 for AI response
        parent_edit = 0  # Since no edits, the parent message is always the first edit of that message number


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-c",
        "--contextual",
        action="store_true",
        help="If this flag is set, the chat is able to use retrieval",
    )
    args = parser.parse_args()

    contextual = args.contextual
    run_chat(contextual)
