import argparse
import json
import os
import time

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.configs.constants import MessageType
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.index_attempt import get_inprogress_index_attempts
from danswer.db.models import Document
from danswer.one_shot_answer.answer_question import get_search_answer
from danswer.one_shot_answer.models import DirectQARequest
from danswer.one_shot_answer.models import OneShotQAResponse
from danswer.one_shot_answer.models import ThreadMessage
from danswer.search.models import IndexFilters
from danswer.search.models import OptionalSearchSetting
from danswer.search.models import RetrievalDetails
from tests.regression.answer_quality.cli_utils import get_current_commit_sha
from tests.regression.answer_quality.cli_utils import get_server_host_port


def _get_answer_for_question(
    query: str, db_session: Session, run_suffix: str
) -> OneShotQAResponse:
    while True:
        in_progress_attempts = get_inprogress_index_attempts(None, db_session)
        if not in_progress_attempts:
            currently_indexed_docs = []
            try:
                currently_indexed_docs = list(
                    db_session.execute(select(Document)).scalars().all()
                )
            except Exception:
                print("unable to access db, trying again...")
            if len(currently_indexed_docs) > 0:
                print(f"found {len(currently_indexed_docs)} number of docs")
                break
            else:
                print("No docs are indexed and no indexing is being done, waiting...")
        else:
            print("Waiting for in-progress index attempts to complete...")
        time.sleep(10)  # Wait for 10 seconds before checking again

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

    vespa_host_port = get_server_host_port("index-", run_suffix, "8081")
    vespa_tenant_host_port = get_server_host_port("index-", run_suffix, "19071")
    os.environ["VESPA_PORT"] = vespa_host_port
    os.environ["VESPA_TENANT_PORT"] = vespa_tenant_host_port
    print(f"Set VESPA_PORT to: {vespa_host_port}")
    print(f"Set VESPA_TENANT_PORT to: {vespa_tenant_host_port}")

    answer = get_search_answer(
        query_req=new_message_request,
        user=None,
        max_document_tokens=None,
        max_history_tokens=None,
        db_session=db_session,
        answer_generation_timeout=100,
        enable_reflexion=False,
        bypass_acl=True,
    )

    return answer


def _read_questions(questions_file_path: str) -> list[dict]:
    with open(questions_file_path, "r") as file:
        data = yaml.safe_load(file)
        questions = data["questions"]
        return questions


def _get_relari_outputs(samples: list[dict], run_suffix: str) -> list[dict]:
    relari_outputs = []
    print("run_suffix:", run_suffix)
    relational_db_port = get_server_host_port("relational_db", run_suffix, "5432")
    engine = get_sqlalchemy_engine(relational_db_port)
    with Session(engine, expire_on_commit=False) as db_session:
        for sample in samples:
            answer = _get_answer_for_question(
                query=sample["question"],
                db_session=db_session,
                run_suffix=run_suffix,
            )
            assert answer.contexts

            relari_outputs.append(
                {
                    "label": sample["id"],
                    "question": sample["question"],
                    "answer": answer.answer,
                    "retrieved_context": [
                        context.content for context in answer.contexts.contexts
                    ],
                }
            )
            break

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
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--questions_file",
        type=str,
        help="Path to the Relari questions file.",
        # default="./tests/regression/answer_quality/combined_golden_dataset.jsonl",
        default="/Users/danswer/danswer/backend/tests/regression/answer_quality/sample_questions.yaml",
    )
    parser.add_argument(
        "--output_folder",
        type=str,
        help="Path to the output results file.",
        default="~/danswer_test_results",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit the number of examples to process.",
    )
    args = parser.parse_args()
    test = os.path.expanduser(args.output_folder)
    answer_relari_questions(args.questions_file, test, "", args.limit)
