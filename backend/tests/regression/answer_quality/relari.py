import json
import os
import time
from types import SimpleNamespace

import yaml

from tests.regression.answer_quality.api_utils import check_if_query_ready
from tests.regression.answer_quality.api_utils import get_answer_from_query
from tests.regression.answer_quality.cli_utils import get_current_commit_sha


def _get_relari_outputs(samples: list[dict], run_suffix: str) -> list[dict]:
    while not check_if_query_ready(run_suffix):
        print("No docs are indexed or no indexing is being done, waiting...")
        time.sleep(5)

    relari_outputs = []
    for sample in samples:
        retrieved_context, answer = get_answer_from_query(
            query=sample["question"],
            run_suffix=run_suffix,
        )

        relari_outputs.append(
            {
                "label": sample["id"],
                "question": sample["question"],
                "answer": answer,
                "retrieved_context": retrieved_context,
            }
        )

    return relari_outputs


def _write_output_file(relari_outputs: list[dict], output_folder_path: str) -> None:
    counter = 1
    output_file_path = os.path.join(
        output_folder_path, f"branch_{get_current_commit_sha()}.txt"
    )
    while os.path.exists(output_file_path):
        output_file_path = os.path.join(
            output_folder_path, f"branch_{get_current_commit_sha()}_{counter}.txt"
        )
        counter += 1
    print("outputting to:", output_file_path)
    with open(output_file_path, "w", encoding="utf-8") as file:
        for output in relari_outputs:
            file.write(json.dumps(output) + "\n")
            file.flush()


def _read_questions(questions_file_path: str) -> list[dict]:
    with open(questions_file_path, "r") as file:
        data = yaml.safe_load(file)
        questions = data["questions"]
        return questions


def answer_relari_questions(
    questions_file: str,
    results_folder_path: str,
    run_suffix: str,
    limit: int | None = None,
) -> None:
    samples = _read_questions(questions_file)

    if limit is not None:
        samples = samples[:limit]

    relari_outputs = _get_relari_outputs(samples=samples, run_suffix=run_suffix)

    _write_output_file(relari_outputs, results_folder_path)


if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(current_dir, "search_test_config.yaml")
    with open(config_path, "r") as file:
        config = SimpleNamespace(**yaml.safe_load(file))

    answer_relari_questions(
        config.questions_file,
        os.path.expanduser(config.output_folder),
        config.existing_test_suffix,
        config.limit,
    )
