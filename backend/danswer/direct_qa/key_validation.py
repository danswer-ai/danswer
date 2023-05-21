from danswer.direct_qa import get_default_backend_qa_model
from danswer.direct_qa.question_answer import OpenAIQAModel
from openai.error import AuthenticationError
from openai.error import Timeout


def check_openai_api_key_is_valid(openai_api_key: str) -> bool:
    if not openai_api_key:
        return False

    qa_model = get_default_backend_qa_model(api_key=openai_api_key, timeout=2)
    if not isinstance(qa_model, OpenAIQAModel):
        raise ValueError("Cannot check OpenAI API key validity for non-OpenAI QA model")

    # try for up to 3 timeouts (e.g. 6 seconds in total)
    for _ in range(3):
        try:
            qa_model.answer_question("Do not respond", [])
            return True
        except AuthenticationError:
            return False
        except Timeout:
            pass

    return False
