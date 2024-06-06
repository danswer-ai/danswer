import time
import re
from threading import Event
from typing import Any
from typing import cast
import pprint
import threading
import json
import dbm
import pickle


from sqlalchemy.orm import Session

from danswer.configs.constants import MessageType
from danswer.configs.danswerbot_configs import DANSWER_BOT_RESPOND_EVERY_CHANNEL
from danswer.configs.danswerbot_configs import NOTIFY_SLACKBOT_NO_ANSWER

from danswer.db.embedding_model import get_current_db_embedding_model
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.models import Persona
from danswer.db.persona import fetch_persona_by_id

from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.one_shot_answer.models import ThreadMessage
from danswer.search.retrieval.search_runner import download_nltk_data
from danswer.search.search_nlp_models import warm_up_encoders
from danswer.server.manage.models import SlackBotTokens
from danswer.utils.logger import setup_logger
from shared_configs.configs import MODEL_SERVER_HOST
from shared_configs.configs import MODEL_SERVER_PORT

from danswer.server.query_and_chat.models import CreateChatMessageRequest

from danswer.db.chat import *
from danswer.chat.process_message import stream_chat_message

# from telebot.async_telebot import AsyncTeleBot
from pyrogram import Client, filters
import asyncio
from danswer.danswerbot.telegram.tokens import fetch_token, TelegramBotToken

from pyrogram.types import Message

from danswer.llm.answering.prompts.citations_prompt import (
    compute_max_document_tokens_for_persona,
)
from danswer.llm.factory import get_llm_for_persona
from danswer.llm.utils import check_number_of_tokens
from danswer.llm.utils import get_max_input_tokens

from danswer.one_shot_answer.answer_question import get_search_answer
from danswer.one_shot_answer.models import DirectQARequest
from danswer.one_shot_answer.models import OneShotQAResponse
from danswer.search.models import BaseFilters
from danswer.search.models import OptionalSearchSetting
from danswer.search.models import RetrievalDetails
from danswer.utils.logger import setup_logger
from shared_configs.configs import ENABLE_RERANKING_ASYNC_FLOW

from danswer.configs.danswerbot_configs import DANSWER_BOT_ANSWER_GENERATION_TIMEOUT
from danswer.configs.danswerbot_configs import DANSWER_BOT_DISABLE_COT
from danswer.configs.danswerbot_configs import DANSWER_BOT_DISABLE_DOCS_ONLY_ANSWER
from danswer.configs.danswerbot_configs import DANSWER_BOT_DISPLAY_ERROR_MSGS
from danswer.configs.danswerbot_configs import DANSWER_BOT_NUM_RETRIES
from danswer.configs.danswerbot_configs import DANSWER_BOT_TARGET_CHUNK_PERCENTAGE
from danswer.configs.danswerbot_configs import DANSWER_BOT_USE_QUOTES
from danswer.configs.danswerbot_configs import DANSWER_REACT_EMOJI
from danswer.configs.danswerbot_configs import DISABLE_DANSWER_BOT_FILTER_DETECT
from danswer.configs.danswerbot_configs import ENABLE_DANSWERBOT_REFLEXION

logger = setup_logger()

conversation_histories = {}

def process_message(query_text, history):
  with Session(get_sqlalchemy_engine()) as db_session:
    # This also handles creating the query event in postgres
    # llm_name = get_default_llm_version()[0]
    persona = cast(
      Persona,
      fetch_persona_by_id(db_session, 1)
    )
    llm = get_llm_for_persona(persona)
    input_tokens = get_max_input_tokens(model_name = llm.config.model_name, model_provider=llm.config.model_provider)
    thread_context_percent = DANSWER_BOT_TARGET_CHUNK_PERCENTAGE
    answer_generation_timeout = DANSWER_BOT_ANSWER_GENERATION_TIMEOUT
    reflexion = ENABLE_DANSWERBOT_REFLEXION
    use_citations = DANSWER_BOT_USE_QUOTES
    use_citations = True
    max_history_tokens = int(input_tokens * DANSWER_BOT_TARGET_CHUNK_PERCENTAGE)
    remaining_tokens =  input_tokens - max_history_tokens
    max_document_tokens = (remaining_tokens - 512 - check_number_of_tokens(query_text))
    bypass_acl = False

    user_message = ThreadMessage(message=query_text, sender="user", role=MessageType.USER)
    history.append(user_message)
    request = DirectQARequest(messages = history, persona_id = 1, retrieval_options = RetrievalDetails(), return_contexts = False)
    bot_answer = get_search_answer(
        query_req=request,
        user=None,
        max_document_tokens=max_document_tokens,
        max_history_tokens=max_history_tokens,
        db_session=db_session,
        answer_generation_timeout=answer_generation_timeout,
        enable_reflexion=reflexion,
        bypass_acl=bypass_acl,
        use_citations=use_citations,
    )
    # history.append(bot_answer)
    # pp = pprint.PrettyPrinter(indent=2, width=100, depth=None)
    # pp.pprint(bot_answer)
    logger.info("ANSWER: " + bot_answer.answer)
    logger.info("REPHRASE: " + bot_answer.rephrase)
    # logger.info(bot_answer.quotes.list)
    history.append(ThreadMessage(message=bot_answer.answer, sender="assistant", role=MessageType.ASSISTANT))
    return bot_answer 


def format_message(text):
  # Split text while preserving links identified by the Markdown link pattern
  pattern = r'(\[\[.+?\]\]\(https?://[^\)]+\))'
  blocks = re.split(pattern, text)
  print(blocks)
  results = []
  last_was_link = False  # Track consecutive links
  url_counter = 1

  for i in range(len(blocks)):
    url_match = re.match(r'\[\[(.+?)\]\]\((http[s]?://[^\)]+)\)', blocks[i])
    if url_match:
      url = url_match.group(2)  # Extract the URL
      print(url)
      # Updated pattern for international characters and better Unicode support
      pattern = r"""
      (
        ([\w]+(?:\s[\w]+){0,2})\s*$  # Captures up to three lowercase words at the end, includes accented characters
        |
        ([\w][\w]+(?:\s[\w][\w]+)*)$  # Captures a series of capitalized words at the end, includes accented characters
        |
        ['"].+?['"]$  # Captures content in quotes at the end
        |
        \(.+?\)$      # Captures content in brackets at the end
      )
      """
      # Find and print the last match in the last block of results
      if results:
        word_match = re.findall(pattern, results[-1], flags=re.VERBOSE | re.UNICODE)
        if word_match:
          url_text = word_match[-1][0]
          results[-1] = re.sub(re.escape(url_text) + r'\s*$', f"[{url_text}]({url})", results[-1], flags=re.VERBOSE | re.UNICODE)
        else:
          results[-1] += f" [link {url_counter}]({url})"
          url_counter += 1
    else:
      if blocks[i].strip():  # only add non-empty blocks
        results.append(blocks[i].strip())

  return ''.join(results)

async def handle_message(bot, message):
  result = {'formatted': None}  # Container to hold results from the thread
  processing_done = threading.Event()

  def process_message_in_thread():
    try:
      history_key = (message.chat.id, message.from_user.id)
      if history_key not in conversation_histories:
        conversation_histories[history_key] = []
      bot_answer = process_message(message.text, conversation_histories[history_key])
      formatted = format_message(bot_answer.answer)
      result['formatted'] = formatted  # Store the result in the shared container
    finally:
      processing_done.set()

  # Start processing the message in a separate thread
  thread = threading.Thread(target=process_message_in_thread)
  thread.start()

  # While the thread is processing, send typing action
  while not processing_done.is_set():
    await bot.send_chat_action(message.chat.id, 'typing')
    await asyncio.sleep(5)  # Adjust the frequency as needed

  # Wait for the thread to complete and join
  thread.join()

  logger.info("Message processing complete")
  await bot.reply_to(message, result['formatted'], parse_mode='Markdown')  # Access the formatted message


def _initialize_telebot(bot, bot_name):
  @bot.message_handler(commands=['start', 'help'])
  async def send_welcome(message):
    await bot.reply_to(message, "Howdy, how are you doing?")

  @bot.message_handler(func=lambda message: _should_respond(bot_name, message))
  async def handle_message_wrapper(message):
    await handle_message(bot, message)
  
  logger.info("Initialized Telegram Bot")

def _should_respond(bot_name, message) -> bool:
  if message.chat.type == "private":
    return True
  if message.text and f'@{bot_name}' in message.text:
    return True
  if message.text and message.reply_to_message and message.reply_to_message.from_user.username == 'mirai_asile_bot':
    return True
  return False

async def main():
  telegram_bot_token: TelegramBotToken | None = None
  telegram_bot: AsyncTeleBot | None = None
  loop = asyncio.get_event_loop()
  polling_task = None

  logger.info("Verifying query preprocessing (NLTK) data is downloaded")
  download_nltk_data()

  while True:
    try:
      latest_telegram_bot_token = fetch_token()

      if latest_telegram_bot_token != telegram_bot_token:
        if telegram_bot_token is not None:
          logger.info("Telegram Bot token has changed - reconnecting")
        else:
          with Session(get_sqlalchemy_engine()) as db_session:
            embedding_model = get_current_db_embedding_model(db_session)
            warm_up_encoders(
              model_name=embedding_model.model_name,
              normalize=embedding_model.normalize,
              model_server_host=MODEL_SERVER_HOST,
              model_server_port=MODEL_SERVER_PORT,
            )

        telegram_bot_token = latest_telegram_bot_token
        if telegram_bot and polling_task:
          polling_task.cancel()

        telegram_bot = AsyncTeleBot(telegram_bot_token.bot_token)
        _initialize_telebot(telegram_bot, telegram_bot_token.bot_name)
        polling_task = loop.create_task(telegram_bot.polling(non_stop=True))

      await asyncio.sleep(60)

    except ConfigNotFoundError:
      logger.debug("Missing Telegram Bot tokens - waiting 60 seconds and trying again")
      if polling_task:
        polling_task.cancel()
      await asyncio.sleep(60)

if __name__ == "__main__":
  # asyncio.run(main())
  try:
    telegram_bot_token = fetch_token()
    telegram_bot = Client(telegram_bot_token.bot_name, telegram_bot_token.api_id, telegram_bot_token.api_hash, bot_token=telegram_bot_token.bot_token)
  except ConfigNotFoundError:
    logger.debug("Missing Telegram Bot tokens")
    exit()
  except:
    logger.debug('Failed to create Telegram Bot Client')
    exit()
  
  @telegram_bot.on_message(filters.command('start'))
  async def start(client: Client, message: Message):
    await message.reply("Hello,\nAsk me any question!")
  
  @telegram_bot.on_message(filters.text & filters.private)
  async def handle_text_message(client: Client, message: Message):   
    with Session(get_sqlalchemy_engine()) as db_session:
      description="Telegram chat"
      # message="How can I ask asylum in France?"
      persona_id=2
      prompt_id=0
      llm_override=None
      prompt_override=None
      chat_session = None
      try:
        with dbm.open('chat_sessions', 'c') as dbm_file:
          chat_session_id = int(dbm_file[str(message.chat.id)])
        chat_session = get_chat_session_by_id(chat_session_id=chat_session_id, user_id=None, db_session=db_session)
      except:
        chat_session = create_chat_session(
          db_session=db_session,
          description=description,
          user_id=None,
          persona_id=persona_id,
          llm_override=llm_override,
          prompt_override=None
        )
        with dbm.open('chat_sessions', 'c') as dbm_file:
          dbm_file[str(message.chat.id)] = str(chat_session.id)

      with dbm.open('parent_id', 'c') as dbm_file:
        try:
          parent_id = int(dbm_file[str(message.chat.id)])
        except:
          parent_id = None
      if not parent_id:
        root_message = get_or_create_root_message(
          chat_session_id=chat_session.id, db_session=db_session
        )
        parent_id = root_message.id

      # parent_id = root_message.id
      search_doc_ids= None
      options = RetrievalDetails(
        run_search = OptionalSearchSetting.ALWAYS
      )
      req = CreateChatMessageRequest(
        chat_session_id=chat_session.id,
        parent_message_id=parent_id,
        message=message.text,
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
      with dbm.open('parent_id', 'c') as dbm_file:
        dbm_file[str(message.chat.id)] = f"{parent_id}"
      await message.reply(res_obj["message"])
      # search_doc_ids = res_obj["context_docs"]["top_documents"]
      # print("context_docs", search_doc_ids)
      # print("citations", res_obj["citations"])

  telegram_bot.run()
