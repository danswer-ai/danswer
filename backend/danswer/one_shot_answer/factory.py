from danswer.configs.app_configs import QA_PROMPT_OVERRIDE
from danswer.configs.app_configs import QA_TIMEOUT
from danswer.db.models import Persona
from danswer.llm.factory import get_default_llm
from danswer.one_shot_answer.interfaces import QAModel
from danswer.one_shot_answer.qa_block import PersonaBasedQAHandler
from danswer.one_shot_answer.qa_block import QABlock
from danswer.one_shot_answer.qa_block import QAHandler
from danswer.one_shot_answer.qa_block import SingleMessageQAHandler
from danswer.one_shot_answer.qa_block import SingleMessageScratchpadHandler
from danswer.one_shot_answer.qa_block import WeakLLMQAHandler
from danswer.utils.logger import setup_logger

logger = setup_logger()


def get_default_qa_handler(
    chain_of_thought: bool = False,
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

    if chain_of_thought:
        return SingleMessageScratchpadHandler()

    return SingleMessageQAHandler()


def get_default_qa_model(
    api_key: str | None = None,
    timeout: int = QA_TIMEOUT,
    chain_of_thought: bool = False,
) -> QAModel:
    llm = get_default_llm(api_key=api_key, timeout=timeout)
    qa_handler = get_default_qa_handler(chain_of_thought=chain_of_thought)

    return QABlock(
        llm=llm,
        qa_handler=qa_handler,
    )


def get_qa_model_for_persona(
    persona: Persona,
    api_key: str | None = None,
    timeout: int = QA_TIMEOUT,
) -> QAModel:
    if not Persona.prompts:
        raise ValueError("Cannot build a prompt with a Prompt object provided.")
    prompt = Persona.prompts[0]
    return QABlock(
        llm=get_default_llm(
            api_key=api_key,
            timeout=timeout,
            gen_ai_model_version_override=persona.llm_model_version_override,
        ),
        qa_handler=PersonaBasedQAHandler(
            system_prompt=prompt.system_text or "", task_prompt=prompt.task_prompt or ""
        ),
    )
