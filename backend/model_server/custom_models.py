import numpy as np
import tensorflow as tf  # type:ignore
from fastapi import APIRouter

from danswer.search.search_nlp_models import get_default_intent_model
from danswer.search.search_nlp_models import get_default_intent_model_tokenizer
from model_server.models import IntentRequest
from model_server.models import IntentResponse

router = APIRouter(prefix="/custom")


@router.post("/intent-model")
def classify_intent(
    intent_request: IntentRequest,
) -> IntentResponse:
    query = intent_request.query
    tokenizer = get_default_intent_model_tokenizer()
    intent_model = get_default_intent_model()
    model_input = tokenizer(query, return_tensors="tf", truncation=True, padding=True)

    predictions = intent_model(model_input)[0]
    probabilities = tf.nn.softmax(predictions, axis=-1)

    class_percentages = np.round(probabilities.numpy() * 100, 2)
    percentages = class_percentages.tolist()[0]

    return IntentResponse(class_probs=list(percentages))


def warm_up_intent_model() -> None:
    intent_tokenizer = get_default_intent_model_tokenizer()
    inputs = intent_tokenizer(
        "danswer", return_tensors="tf", truncation=True, padding=True
    )
    get_default_intent_model()(inputs)
