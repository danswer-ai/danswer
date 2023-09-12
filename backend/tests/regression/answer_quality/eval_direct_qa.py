import argparse
from datetime import datetime

import yaml
from sqlalchemy.orm import Session

from danswer.db.engine import get_sqlalchemy_engine
from danswer.direct_qa.answer_question import answer_qa_query
from danswer.server.models import QuestionRequest


engine = get_sqlalchemy_engine()


def load_yaml(filepath: str) -> dict:
    with open(filepath, "r") as file:
        data = yaml.safe_load(file)
    return data


def word_wrap(s: str, max_line_size: int = 120) -> str:
    words = s.split()

    current_line: list[str] = []
    result_lines: list[str] = []
    current_length = 0
    for word in words:
        if len(word) > max_line_size:
            if current_line:
                result_lines.append(" ".join(current_line))
                current_line = []
                current_length = 0

            result_lines.append(word)
            continue

        if current_length + len(word) + len(current_line) > max_line_size:
            result_lines.append(" ".join(current_line))
            current_line = []
            current_length = 0

        current_line.append(word)
        current_length += len(word)

    if current_line:
        result_lines.append(" ".join(current_line))

    return "\n".join(result_lines)


def get_answer_for_question(query: str, db_session: Session) -> str | None:
    question = QuestionRequest(
        query=query,
        collection="danswer_index",
        use_keyword=None,
        filters=None,
        offset=None,
    )

    answer = answer_qa_query(
        question=question,
        user=None,
        db_session=db_session,
        answer_generation_timeout=100,
        real_time_flow=False,
    )

    return answer.answer


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "regression_yaml",
        type=str,
        help="Path to the Questions YAML file.",
        default="./tests/regression/answer_quality/sample_questions.yaml",
        nargs="?",
    )
    parser.add_argument(
        "--real-time", action="store_true", help="Set to use the real-time flow."
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Path to the output results file.",
        default="./tests/regression/answer_quality/regression_results.txt",
    )
    args = parser.parse_args()

    questions_data = load_yaml(args.regression_yaml)

    with open(args.output, "w") as outfile:
        print("Running Question Answering Flow", file=outfile)

        with Session(engine, expire_on_commit=False) as db_session:
            for sample in questions_data["questions"]:
                # This line goes to stdout to track progress
                print(f"Running Test for Question {sample['id']}: {sample['question']}")

                start_time = datetime.now()
                answer = get_answer_for_question(sample["question"], db_session)
                end_time = datetime.now()

                print(f"====Duration: {end_time - start_time}====", file=outfile)
                print(f"Question {sample['id']}:", file=outfile)
                print(sample["question"], file=outfile)
                print("\nExpected Answer:", file=outfile)
                print(sample["expected_answer"], file=outfile)
                print("\nActual Answer:", file=outfile)
                print(
                    word_wrap(answer)
                    if answer
                    else "Failed, either crashed or refused to answer.",
                    file=outfile,
                )
                print("\n\n", file=outfile, flush=True)
