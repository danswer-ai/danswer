from danswer.configs.app_configs import QA_TIMEOUT
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.qa_block import QABlock
from danswer.direct_qa.qa_block import QAHandler
from danswer.direct_qa.qa_block import SingleMessageQAHandler
from danswer.direct_qa.qa_block import SingleMessageScratchpadHandler
from danswer.llm.factory import get_default_llm
from danswer.utils.logger import setup_logger

logger = setup_logger()


# TODO introduce the prompt choice parameter
def get_default_qa_handler(real_time_flow: bool = True) -> QAHandler:
    return (
        SingleMessageQAHandler() if real_time_flow else SingleMessageScratchpadHandler()
    )
    # return SimpleChatQAHandler()


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
