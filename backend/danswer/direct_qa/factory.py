from danswer.configs.app_configs import QA_PROMPT_OVERRIDE
from danswer.configs.app_configs import QA_TIMEOUT
from danswer.db.models import Persona
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.qa_block import PersonaBasedQAHandler
from danswer.direct_qa.qa_block import QABlock
from danswer.direct_qa.qa_block import QAHandler
from danswer.direct_qa.qa_block import SingleMessageQAHandler
from danswer.direct_qa.qa_block import SingleMessageScratchpadHandler
from danswer.direct_qa.qa_block import WeakLLMQAHandler
from danswer.llm.factory import get_default_llm
from danswer.utils.logger import setup_logger

logger = setup_logger()


def get_default_qa_handler(
    real_time_flow: bool = True,
    user_selection: str | None = QA_PROMPT_OVERRIDE,
) -> QAHandler:
    if user_selection:
        if user_selection.lower() == "default":
            return SingleMessageQAHandler()
        if user_selection.lower() == "cot":
            return SingleMessageScratchpadHandler()
        if user_selection.lower() == "weak":
            return WeakLLMQAHandler()

        raise ValueError("Invalid Question-Answering prompt selected")

    if not real_time_flow:
        return SingleMessageScratchpadHandler()

    return SingleMessageQAHandler()


def get_default_qa_model(
    api_key: str | None = None,
    timeout: int = QA_TIMEOUT,
    real_time_flow: bool = True,
) -> QAModel:
    llm = get_default_llm(api_key=api_key, timeout=timeout)
    qa_handler = get_default_qa_handler(real_time_flow=real_time_flow)

    return QABlock(
        llm=llm,
        qa_handler=qa_handler,
    )


def get_qa_model_for_persona(
    persona: Persona,
    api_key: str | None = None,
    timeout: int = QA_TIMEOUT,
) -> QAModel:
    return QABlock(
        llm=get_default_llm(api_key=api_key, timeout=timeout),
        qa_handler=PersonaBasedQAHandler(
            system_prompt=persona.system_text or "", task_prompt=persona.hint_text or ""
        ),
    )
