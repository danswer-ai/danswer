from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.question_answer import OpenAICompletionQA


def get_default_backend_qa_model() -> QAModel:
    return OpenAICompletionQA()
