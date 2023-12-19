from danswer.configs.chat_configs import QA_PROMPT_OVERRIDE
from danswer.configs.chat_configs import QA_TIMEOUT
from danswer.db.models import Prompt
from danswer.llm.factory import get_default_llm
from danswer.one_shot_answer.interfaces import QAModel
from danswer.one_shot_answer.qa_block import PromptBasedQAHandler
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


def get_prompt_qa_model(
    prompt: Prompt,
    api_key: str | None = None,
    timeout: int = QA_TIMEOUT,
    llm_version: str | None = None,
) -> QAModel:
    return QABlock(
        llm=get_default_llm(
            api_key=api_key,
            timeout=timeout,
            gen_ai_model_version_override=llm_version,
        ),
        qa_handler=PromptBasedQAHandler(
            system_prompt=prompt.system_prompt, task_prompt=prompt.task_prompt
        ),
    )


def get_question_answer_model(
    prompt: Prompt | None,
    api_key: str | None = None,
    timeout: int = QA_TIMEOUT,
    chain_of_thought: bool = False,
    llm_version: str | None = None,
) -> QAModel:
    if prompt is None and llm_version is not None:
        raise RuntimeError(
            "Cannot specify llm version for QA model without providing prompt. "
            "This flow is only intended for flows with a specified Persona/Prompt."
        )

    if prompt is not None and chain_of_thought:
        raise RuntimeError(
            "Cannot choose COT prompt with a customized Prompt object. "
            "User can prompt the model to output COT themselves if they want."
        )

    if prompt is not None:
        return get_prompt_qa_model(
            prompt=prompt,
            api_key=api_key,
            timeout=timeout,
            llm_version=llm_version,
        )

    return get_default_qa_model(
        api_key=api_key,
        timeout=timeout,
        chain_of_thought=chain_of_thought,
    )
