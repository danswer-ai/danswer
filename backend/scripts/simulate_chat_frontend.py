# This file is purely for development use, not included in any builds
# Use this to test the chat feature
# This script does not allow for branching logic that is supported by the backend APIs
# This script also does not allow for editing/regeneration of user/model messages
# Have Danswer API server running to use this.
import json

import requests

from danswer.configs.app_configs import APP_PORT

LOCAL_CHAT_ENDPOINT = f"http://127.0.0.1:{APP_PORT}/chat/"


def create_new_session() -> int:
    data = {"persona_id": 0}  # Global default Persona
    response = requests.post(LOCAL_CHAT_ENDPOINT + "create-chat-session", json=data)
    response.raise_for_status()
    new_session_id = response.json()["chat_session_id"]
    return new_session_id


def send_chat_message(
    message: str,
    chat_session_id: int,
    parent_message: int | None,
) -> int:
    data = {
        "message": message,
        "chat_session_id": chat_session_id,
        "parent_message_id": parent_message,
        "prompt_id": 0,  # Global default Prompt
        "retrieval_options": {
            "run_search": "always",
            "real_time": True,
            "filters": {"tags": []},
        },
    }

    docs: list[dict] | None = None
    message_id: int | None = None
    with requests.post(
        LOCAL_CHAT_ENDPOINT + "send-message", json=data, stream=True
    ) as r:
        for json_response in r.iter_lines():
            response_text = json.loads(json_response.decode())
            new_token = response_text.get("answer_piece")
            if docs is None:
                docs = response_text.get("top_documents")
            if message_id is None:
                message_id = response_text.get("message_id")
            if new_token:
                print(new_token, end="", flush=True)
        print()

    if docs:
        docs.sort(key=lambda x: x["score"], reverse=True)  # type: ignore
        print("\nReference Docs:")
        for ind, doc in enumerate(docs, start=1):
            print(f"\t - Doc {ind}: {doc.get('semantic_identifier')}")

    if message_id is None:
        raise ValueError("Couldn't get latest message id")

    return message_id


def run_chat() -> None:
    try:
        new_session_id = create_new_session()
        print(f"Chat Session ID: {new_session_id}")
    except requests.exceptions.ConnectionError:
        print(
            "Looks like you haven't started the Danswer Backend server, please run the FastAPI server"
        )
        exit()
        return

    parent_message = None
    while True:
        new_message = input(
            "\n\n----------------------------------\n"
            "Please provide a new chat message:\n> "
        )

        parent_message = send_chat_message(
            new_message, new_session_id, parent_message=parent_message
        )


if __name__ == "__main__":
    run_chat()
