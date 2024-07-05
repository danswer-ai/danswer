import json
import os
import time
from types import SimpleNamespace

import requests
import yaml

from danswer.configs.constants import MessageType
from danswer.db.enums import IndexingStatus
from danswer.one_shot_answer.models import DirectQARequest
from danswer.one_shot_answer.models import ThreadMessage
from danswer.search.models import IndexFilters
from danswer.search.models import OptionalSearchSetting
from danswer.search.models import RetrievalDetails
from tests.regression.answer_quality.cli_utils import api_url_builder
from tests.regression.answer_quality.cli_utils import get_current_commit_sha


def _get_answer_from_query(query: str, run_suffix: str) -> tuple[list[str], str]:
    filters = IndexFilters(
        source_type=None,
        document_set=None,
        time_cutoff=None,
        tags=None,
        access_control_list=None,
    )

    messages = [ThreadMessage(message=query, sender=None, role=MessageType.USER)]

    new_message_request = DirectQARequest(
        messages=messages,
        prompt_id=0,
        persona_id=0,
        retrieval_options=RetrievalDetails(
            run_search=OptionalSearchSetting.ALWAYS,
            real_time=True,
            filters=filters,
            enable_auto_detect_filters=False,
        ),
        chain_of_thought=False,
        return_contexts=True,
    )

    url = api_url_builder(run_suffix, "/query/answer-with-quote/")
    headers = {
        "Content-Type": "application/json",
    }

    body = new_message_request.dict()
    body["user"] = None
    response_json = requests.post(url, headers=headers, json=body).json()
    content_list = [
        context.get("content", "")
        for context in response_json.get("contexts", {}).get("contexts", [])
    ]
    answer = response_json.get("answer")
    print("\nquery: ", query)
    print("answer: ", answer)
    print("content_list: ", content_list)

    return content_list, answer


def _check_if_query_ready(run_suffix: str) -> bool:
    url = api_url_builder(run_suffix, "/manage/admin/connector/indexing-status/")
    headers = {
        "Content-Type": "application/json",
    }

    response_json = requests.get(url, headers=headers).json()
    doc_count = 0
    for thing in response_json:
        status = thing["last_status"]
        if status == IndexingStatus.IN_PROGRESS or status == IndexingStatus.NOT_STARTED:
            return False
        doc_count += thing["docs_indexed"]

    return doc_count > 0


def _get_relari_outputs(samples: list[dict], run_suffix: str) -> list[dict]:
    while not _check_if_query_ready(run_suffix):
        print("No docs are indexed or no indexing is being done, waiting...")
        time.sleep(5)

    relari_outputs = []
    for sample in samples:
        retrieved_context, answer = _get_answer_from_query(
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
        "",
        config.limit,
    )
