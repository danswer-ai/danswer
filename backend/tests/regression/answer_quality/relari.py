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
        time.sleep(5)

    relari_outputs = []
    for sample in samples:
        retrieved_context, answer = get_answer_from_query(
            query=sample["question"],
            run_suffix=run_suffix,
        )

        relari_outputs.append(
            {
                "label": sample["uid"],
                "question": sample["question"],
                "answer": answer,
                "retrieved_context": retrieved_context,
            }
        )

    return relari_outputs


def _write_output_file(
    relari_outputs: list[dict], output_folder_path: str, run_suffix: str
) -> None:
    metadata = {"commit_sha": get_current_commit_sha(), "run_suffix": run_suffix}

    counter = 1
    output_file_path = os.path.join(output_folder_path, "results.txt")
    metadata_file_path = os.path.join(output_folder_path, "run_metadata.yaml")
    while os.path.exists(output_file_path) or os.path.exists(metadata_file_path):
        output_file_path = os.path.join(output_folder_path, f"results_{counter}.txt")
        metadata_file_path = os.path.join(
            output_folder_path, f"run_metadata_{counter}.txt"
        )
        counter += 1
    print("saving question results to:", output_file_path)
    print("saving metadata to:", metadata_file_path)
    with open(metadata_file_path, "w", encoding="utf-8") as yaml_file:
        yaml.dump(metadata, yaml_file)
    with open(output_file_path, "w", encoding="utf-8") as file:
        for output in relari_outputs:
            file.write(json.dumps(output) + "\n")
            file.flush()


def _read_questions_jsonl(questions_file_path: str) -> list[dict]:
    questions = []
    with open(questions_file_path, "r") as file:
        for line in file:
            json_obj = json.loads(line)
            questions.append(json_obj)
    return questions


def answer_relari_questions(
    questions_file_path: str,
    results_folder_path: str,
    run_suffix: str,
    limit: int | None = None,
) -> None:
    samples = _read_questions_jsonl(questions_file_path)

    if limit is not None:
        samples = samples[:limit]

    relari_outputs = _get_relari_outputs(samples=samples, run_suffix=run_suffix)

    _write_output_file(relari_outputs, results_folder_path, run_suffix)


def main() -> None:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(current_dir, "search_test_config.yaml")
    with open(config_path, "r") as file:
        config = SimpleNamespace(**yaml.safe_load(file))

    current_output_folder = os.path.expanduser(config.output_folder)
    if config.existing_test_suffix:
        current_output_folder = os.path.join(
            current_output_folder, "test" + config.existing_test_suffix, "relari_output"
        )
    else:
        current_output_folder = os.path.join(current_output_folder, "no_defined_suffix")

    answer_relari_questions(
        config.questions_file,
        current_output_folder,
        config.existing_test_suffix,
        config.limit,
    )


if __name__ == "__main__":
    main()
