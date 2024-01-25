import numpy as np
from fastapi import APIRouter

from danswer.search.search_nlp_models import get_intent_model_tokenizer
from danswer.search.search_nlp_models import get_local_intent_model
from danswer.utils.timing import log_function_time
from shared_models.model_server_models import IntentRequest
from shared_models.model_server_models import IntentResponse

router = APIRouter(prefix="/custom")


@log_function_time(print_only=True)
def classify_intent(query: str) -> list[float]:
    import tensorflow as tf  # type:ignore

    tokenizer = get_intent_model_tokenizer()
    intent_model = get_local_intent_model()
    model_input = tokenizer(query, return_tensors="tf", truncation=True, padding=True)

    predictions = intent_model(model_input)[0]
    probabilities = tf.nn.softmax(predictions, axis=-1)

    class_percentages = np.round(probabilities.numpy() * 100, 2)
    return list(class_percentages.tolist()[0])


@router.post("/intent-model")
def process_intent_request(
    intent_request: IntentRequest,
) -> IntentResponse:
    class_percentages = classify_intent(intent_request.query)
    return IntentResponse(class_probs=class_percentages)


def warm_up_intent_model() -> None:
    intent_tokenizer = get_intent_model_tokenizer()
    inputs = intent_tokenizer(
        "danswer", return_tensors="tf", truncation=True, padding=True
    )
    get_local_intent_model()(inputs)
