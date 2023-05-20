from danswer.configs.app_configs import OPENAI_API_KEY
from danswer.configs.constants import OPENAI_API_KEY_STORAGE_KEY
from danswer.direct_qa import get_default_backend_qa_model
from danswer.direct_qa.question_answer import OpenAIQAModel
from danswer.dynamic_configs import get_dynamic_config_store
from openai.error import AuthenticationError


def check_openai_api_key_is_valid(openai_api_key: str) -> bool:
    if not openai_api_key:
        return False

    qa_model = get_default_backend_qa_model(api_key=openai_api_key)
    if not isinstance(qa_model, OpenAIQAModel):
        raise ValueError("Cannot check OpenAI API key validity for non-OpenAI QA model")

    try:
        qa_model.answer_question("Do not respond", [])
        return True
    except AuthenticationError:
        return False
