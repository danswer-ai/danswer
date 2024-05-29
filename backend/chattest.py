from sqlalchemy.orm import Session
import json

from danswer.db.engine import get_sqlalchemy_engine, build_connection_string, SYNC_DB_API
from danswer.db.chat import *
from danswer.search.models import RetrievalDetails, OptionalSearchSetting
from danswer.chat.process_message import stream_chat_message
from danswer.server.query_and_chat.models import CreateChatMessageRequest
from danswer.llm.utils import get_default_llm_tokenizer

from prompt_toolkit import prompt
from prompt_toolkit.key_binding import KeyBindings
from prompt_toolkit.keys import Keys
from prompt_toolkit.document import Document
from prompt_toolkit.styles import Style
from prompt_toolkit.formatted_text import HTML, ANSI
from prompt_toolkit.history import InMemoryHistory

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

  description="Telegram chat"
  message="How can I ask asylum in France?"
  persona_id=0
  prompt_id=0
  llm_override=None
  prompt_override=None

  new_session = create_chat_session(
    db_session=db_session,
    description=description,
    user_id=None,
    persona_id=persona_id,
    llm_override=llm_override,
    prompt_override=None
  )

  root_message = get_or_create_root_message(
    chat_session_id=new_session.id, db_session=db_session
  )

  parent_id = root_message.id
  search_doc_ids= None
  options = RetrievalDetails(
    run_search = OptionalSearchSetting.AUTO
  )


  while True:
    user_input=prompt("You: ")
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
    result = "\n".join(stream_chat_message(
      new_msg_req=req,
      user=None
    )).split('\n')
    # print("RESULT", result[-2])
    res_obj = json.loads(result[-2])
    parent_id = res_obj["message_id"]
    print(res_obj["message"])
    search_doc_ids = res_obj["context_docs"]["top_documents"]
    print("context_docs", search_doc_ids)
    print("citations", res_obj["citations"])


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
  pass
