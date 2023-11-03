import random
import time

import nltk
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

additional_questions = [
    "Who wrote the play 'Hamlet'?",
    "What is the speed of light in a vacuum?",
    "When did World War I begin?",
    "Who was known as the 'Father of Medicine'?",
    "What's the largest mammal on Earth?",
    "Which element has the atomic number 79?",
    "When did the Renaissance period begin?",
    "What is the currency used in Japan?",
    "Who proposed the theory of evolution by natural selection?",
    "Which planet has a day that lasts longer than its year?",
    "What is the capital of Australia?",
    "Who painted the Last Supper?",
    "How do plants get their green color?",
    "When was the Magna Carta signed?",
    "What are the building blocks of proteins?",
    "Which civilization built Machu Picchu?",
    "What's the most abundant gas in Earth's atmosphere?",
    "Who translated the Bible into German during the Reformation?",
    "What causes the tides in the ocean?",
    "When did the Olympic Games originate?",
    "What is a black hole?",
    "Which river is the longest in the world?",
    "Who invented the telephone?",
    "When was the French Revolution?",
    "What is the smallest prime number?",
    "Which country is known as the Land of the Rising Sun?",
    "Who composed the Four Seasons?",
    "What is the periodic table?",
    "When was the Great Depression?",
    "What is the primary function of red blood cells?",
    "Who is known for his laws of motion?",
    "Which ancient wonder was located in the city of Babylon?",
    "What are the base pairs in DNA?",
    "When was the first airplane flight?",
    "What's the main ingredient in guacamole?",
    "Which empire was ruled by Suleiman the Magnificent?",
    "What is the human body's largest organ?",
    "Who authored 'Brave New World'?",
    "How does electricity work?",
    "When did the Cold War end?",
    "What's the difference between prokaryotic and eukaryotic cells?",
    "Which mountain range includes Mount Everest?",
    "Who is the Greek god of war?",
    "When was the printing press invented?",
    "What are antibiotics used for?",
    "Which desert is the driest on Earth?",
    "Who was the first African American U.S. Supreme Court Justice?",
    "How many teeth do adult humans typically have?",
    "Who is the protagonist in 'The Catcher in the Rye'?",
    "What is the study of fossils called?",
]

# Download the wordlist
nltk.download("words")
from nltk.corpus import words  # noqa: E402


def generate_random_sentence():
    word_list = words.words()
    sentence_length = random.randint(5, 10)
    sentence = " ".join(random.choices(word_list, k=sentence_length))
    return sentence


def _measure_search_latency(
    query: str,
    search_type: SearchType,
    skip_rerank: bool = True,
    enable_auto_detect_filters: bool = False,
    filters: dict | None = None,
):
    start = time.monotonic()
    response = requests.post(
        "http://localhost:8080/document-search",
        json={
            "query": query,
            "collection": DOCUMENT_INDEX_NAME,
            "filters": filters or {},
            "enable_auto_detect_filters": enable_auto_detect_filters,
            "search_type": search_type,
            "skip_rerank": skip_rerank,
        },
    )
    if not response.ok:
        raise Exception(f"Failed to search: {response.text}")
    return time.monotonic() - start


if __name__ == "__main__":
    sentences = question_bank + additional_questions
    num_trials = 100

    latencies: list[float] = []
    for i in range(num_trials):
        latencies.append(
            _measure_search_latency(query=sentences[i], search_type=SearchType.KEYWORD)
        )
        print("Latency", latencies[-1])

    latencies = sorted(latencies)

    print(f"[Keyword] Average latency: {sum(latencies) / len(latencies)}")
    print(f"[Keyword] P50: {latencies[int(num_trials * 0.5)]}")
    print(f"[Keyword] P95: {latencies[int(num_trials * 0.95)]}")

    latencies: list[float] = []
    for i in range(num_trials):
        latencies.append(
            _measure_search_latency(query=sentences[i], search_type=SearchType.HYBRID)
        )
        print("Latency", latencies[-1])

    latencies = sorted(latencies)

    print(f"[Hybrid] Average latency: {sum(latencies) / len(latencies)}")
    print(f"[Hybrid] P50: {latencies[int(num_trials * 0.5)]}")
    print(f"[Hybrid] P95: {latencies[int(num_trials * 0.95)]}")

    latencies: list[float] = []
    for i in range(num_trials):
        latencies.append(
            _measure_search_latency(
                query=sentences[i],
                search_type=SearchType.HYBRID,
                skip_rerank=False,
            )
        )
        print("Latency", latencies[-1])

    latencies = sorted(latencies)

    print(f"[Hybrid + CE] Average latency: {sum(latencies) / len(latencies)}")
    print(f"[Hybrid + CE] P50: {latencies[int(num_trials * 0.5)]}")
    print(f"[Hybrid + CE] P95: {latencies[int(num_trials * 0.95)]}")

    latencies: list[float] = []
    for i in range(num_trials):
        latencies.append(
            _measure_search_latency(
                query=sentences[i],
                search_type=SearchType.HYBRID,
                skip_rerank=False,
                enable_auto_detect_filters=True,
            )
        )
        print("Latency", latencies[-1])

    latencies = sorted(latencies)

    print(f"[Hybrid + CE + filters] Average latency: {sum(latencies) / len(latencies)}")
    print(f"[Hybrid + CE + filters] P50: {latencies[int(num_trials * 0.5)]}")
    print(f"[Hybrid + CE + filters] P95: {latencies[int(num_trials * 0.95)]}")
