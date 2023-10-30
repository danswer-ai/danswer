import random
import time

import requests

from danswer.configs.app_configs import DOCUMENT_INDEX_NAME
from danswer.search.models import SearchType

question_bank = [
    "Who was the first president of the United States?",
    "What is photosynthesis?",
    "How long is the Great Wall of China?",
    "When was the Eiffel Tower constructed?",
    "Who wrote 'Pride and Prejudice'?",
    "What's the difference between mitosis and meiosis?",
    "What is the capital of Brazil?",
    "Who discovered penicillin?",
    "What causes the Aurora Borealis?",
    "When did the Titanic sink?",
    "How does a combustion engine work?",
    "Who is the author of 'The Odyssey'?",
    "What is quantum physics?",
    "When was the Mona Lisa painted?",
    "What's the difference between a meteor and a meteorite?",
    "Who founded the city of Rome?",
    "What is the boiling point of water at sea level?",
    "Who won the Nobel Prize in Literature in 1953?",
    "How do honeybees produce honey?",
    "What is the deepest part of the ocean?",
    "When did the first humans arrive in the Americas?",
    "What is the Fibonacci sequence?",
    "How was the Grand Canyon formed?",
    "Who composed the Moonlight Sonata?",
    "What are the primary colors of light?",
    "When did the Roman Empire fall?",
    "How does photosynthesis contribute to the carbon cycle?",
    "Who was the first woman in space?",
    "What is the Pythagorean theorem?",
    "Which planet is known as the 'Red Planet'?",
    "Who is the father of modern physics?",
    "What is the primary purpose of the United Nations?",
    "How old is the Earth?",
    "Who wrote 'Don Quixote'?",
    "What is the structure of DNA?",
    "When was the Declaration of Independence signed?",
    "What causes a solar eclipse?",
    "Who was the longest-reigning British monarch?",
    "How do tornadoes form?",
    "Who developed the theory of relativity?",
    "What's the tallest mountain on Earth when measured from base to peak?",
    "How many bones are there in the adult human body?",
    "When was the Internet invented?",
    "Who was the ancient Egyptian queen known for her relationship with Roman leaders?",
    "What is the Krebs cycle?",
    "Which country has the largest land area?",
    "Who painted the Starry Night?",
    "What's the difference between an alligator and a crocodile?",
    "Who discovered the circulation of blood?",
    "How many planets are there in our solar system?",
]


def _measure_hybrid_search_latency(filters: dict = {}):
    start = time.monotonic()
    response = requests.post(
        "http://localhost:8080/document-search",
        json={
            "query": random.choice(question_bank),
            "collection": DOCUMENT_INDEX_NAME,
            "filters": filters,
            "enable_auto_detect_filters": False,
            "search_type": SearchType.HYBRID.value,
        },
    )
    if not response.ok:
        raise Exception(f"Failed to search: {response.text}")
    return time.monotonic() - start


if __name__ == "__main__":
    latencies: list[float] = []
    for _ in range(50):
        latencies.append(_measure_hybrid_search_latency())
        print("Latency", latencies[-1])
    print(f"Average latency: {sum(latencies) / len(latencies)}")

    print("Testing with filters")
    for _ in range(50):
        latencies.append(
            _measure_hybrid_search_latency(filters={"source_type": ["file"]})
        )
        print("Latency", latencies[-1])
    print(f"Average latency: {sum(latencies) / len(latencies)}")
