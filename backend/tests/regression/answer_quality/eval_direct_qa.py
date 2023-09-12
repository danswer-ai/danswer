import argparse

import yaml
from sqlalchemy.orm import Session

from danswer.db.engine import get_sqlalchemy_engine
from danswer.direct_qa.answer_question import answer_qa_query
from danswer.server.models import QuestionRequest


def load_yaml(filepath: str) -> dict:
    with open(filepath, "r") as file:
        data = yaml.safe_load(file)
    return data


def ask_question(query: str) -> None:
    question = QuestionRequest(
        query=query,
        collection="danswer_index",
        use_keyword=None,
        filters=None,
        offset=None,
    )

    engine = get_sqlalchemy_engine()
    with Session(engine, expire_on_commit=False) as db_session:
        answer = answer_qa_query(
            question=question,
            user=None,
            db_session=db_session,
            answer_generation_timeout=100,
            real_time_flow=False,
        )
        print(answer.answer)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "regression_yaml",
        type=str,
        help="Path to the Questions YAML file.",
        default="./tests/regression/answer_quality/sample_questions.yaml",
        nargs="?",
    )
    # Specifying real-time means using the prompt meant for streaming. This one tries to get the first
    # token out ASAP. Disabling it results in better results via CoT
    parser.add_argument(
        "--real-time", action="store_true", help="Set to use the real-time flow."
    )
    args = parser.parse_args()

    questions_data = load_yaml(args.regression_yaml)
    print(questions_data)
