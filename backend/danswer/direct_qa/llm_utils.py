from typing import Any

from openai.error import AuthenticationError

from danswer.configs.app_configs import QA_TIMEOUT
from danswer.configs.constants import DanswerGenAIModel
from danswer.configs.model_configs import GEN_AI_API_KEY
from danswer.configs.model_configs import INTERNAL_MODEL_VERSION
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.qa_block import QABlock
from danswer.direct_qa.qa_block import QAHandler
from danswer.direct_qa.qa_block import SimpleChatQAHandler
from danswer.direct_qa.qa_block import SingleMessageQAHandler
from danswer.direct_qa.qa_block import SingleMessageScratchpadHandler
from danswer.direct_qa.qa_utils import get_gen_ai_api_key
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.llm.build import get_default_llm
from danswer.utils.logger import setup_logger

logger = setup_logger()


def check_model_api_key_is_valid(model_api_key: str) -> bool:
    if not model_api_key:
        return False

    llm = get_default_llm(api_key=model_api_key, timeout=10)

    # try for up to 2 timeouts (e.g. 10 seconds in total)
    for _ in range(2):
        try:
            llm.invoke("Do not respond")
            return True
        except AuthenticationError:
            return False
        except Exception as e:
            logger.warning(f"GenAI API key failed for the following reason: {e}")

    return False


def get_default_qa_handler(model: str, real_time_flow: bool = True) -> QAHandler:
    # TODO update this
    if model == DanswerGenAIModel.OPENAI_CHAT.value:
        return (
            SingleMessageQAHandler()
            if real_time_flow
            else SingleMessageScratchpadHandler()
        )

    return SimpleChatQAHandler()


def get_default_qa_model(
    internal_model: str = INTERNAL_MODEL_VERSION,
    api_key: str | None = GEN_AI_API_KEY,
    timeout: int = QA_TIMEOUT,
    real_time_flow: bool = True,
    **kwargs: Any,
) -> QAModel:
    if not api_key:
        try:
            api_key = get_gen_ai_api_key()
        except ConfigNotFoundError:
            pass

    # un-used arguments will be ignored by the underlying `LLM` class
    # if any args are missing, a `TypeError` will be thrown
    llm = get_default_llm(timeout=timeout)
    qa_handler = get_default_qa_handler(
        model=internal_model, real_time_flow=real_time_flow
    )

    return QABlock(
        llm=llm,
        qa_handler=qa_handler,
    )
