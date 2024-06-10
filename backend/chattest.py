import json

from prompt_toolkit import prompt
from sqlalchemy.orm import Session

from danswer.chat.process_message import stream_chat_message
from danswer.db.chat import *  # noqa F403
from danswer.db.engine import get_sqlalchemy_engine
from danswer.search.models import OptionalSearchSetting
from danswer.search.models import RetrievalDetails
from danswer.server.query_and_chat.models import CreateChatMessageRequest

# print(build_connection_string(db_api=SYNC_DB_API))

with Session(get_sqlalchemy_engine()) as db_session:
    # new_chat_session = create_chat_session(
    #   db_session=db_session,
    #   description="Telegram chat",
    #   user_id=None,
    #   persona_id=0,
    #   danswerbot_flow=True
    # )

    # seed = ChatSeedRequest(
    #   persona_id=0,
    #   prompt_id=0,
    #   llm_override=None,
    #   prompt_override=None,
    #   description="Telegram chat",
    #   message="What can you do?"
    # )

    description = "Telegram chat"
    message = "How can I ask asylum in France?"
    persona_id = 0
    prompt_id = 0
    llm_override = None
    prompt_override = None

    new_session = create_chat_session(  # noqa F405
        db_session=db_session,
        description=description,
        user_id=None,
        persona_id=persona_id,
        llm_override=llm_override,
        prompt_override=None,
    )

    root_message = get_or_create_root_message(  # noqa: F405
        chat_session_id=new_session.id, db_session=db_session
    )

    # tag_filters = BaseFilters(
    #     tags=[Tag(tag_key="Tags", tag_value="равенство")]
    # )  # эксперимент

    parent_id = root_message.id
    search_doc_ids = None
    options = RetrievalDetails(
        run_search=OptionalSearchSetting.AUTO,
        # filters=tag_filters,
    )

    while True:
        user_input = prompt("You: ")
        if user_input.lower() == "exit":
            break
        req = CreateChatMessageRequest(
            chat_session_id=new_session.id,
            parent_message_id=parent_id,
            message=user_input,
            file_descriptors=[],
            prompt_id=prompt_id,
            search_doc_ids=None,
            retrieval_options=options,
            query_override=None,
        )
        result = "\n".join(stream_chat_message(new_msg_req=req, user=None)).split("\n")
        # print("RESULT", result[-2])
        res_obj = json.loads(result[-2])
        parent_id = res_obj["message_id"]
        print(res_obj["message"])
        search_doc_ids = res_obj["context_docs"]["top_documents"]
        print("context_docs", search_doc_ids)
        print("citations", res_obj["citations"])

        # with open("full_chat.json", "w", encoding="utf-8") as f:
        #     f.write(json.dumps(result, indent=2, ensure_ascii=False))
        # with open("extracted_res.json", "w", encoding="utf-8") as f:
        #     f.write(json.dumps(res_obj, indent=2, ensure_ascii=False))

    # create_new_chat_message(
    #   chat_session_id=new_session.id,
    #   parent_message=root_message,
    #   prompt_id=prompt_id
    #   or (
    #     new_session.persona.prompts[0].id
    #     if new_session.persona.prompts
    #     else None
    #   ),
    #   message=message,
    #   token_count=len(
    #     get_default_llm_tokenizer().encode(message)
    #   ),
    #   message_type=MessageType.USER,
    #   db_session=db_session,
    # )

    # session_id = new_chat_session.id
    # msg_text = "What can you do?"

    # req = CreateChatMessageRequest()
    # req.chat_session_id=session_id
    # req.message=msg_text
