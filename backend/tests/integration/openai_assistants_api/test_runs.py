from uuid import UUID

import pytest
import requests

from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.test_models import DATestUser

RUNS_URL = f"{API_SERVER_URL}/openai-assistants/runs"


@pytest.fixture
def admin_user():
    try:
        return UserManager.create(name="admin_user")
    except Exception:
        return None


@pytest.fixture
def thread_id(admin_user: DATestUser | None) -> UUID:
    # Create a thread to use in the tests
    response = requests.post(
        f"{API_SERVER_URL}/openai-assistants/threads",
        json={},
        headers=admin_user.headers if admin_user else GENERAL_HEADERS,
    )
    assert response.status_code == 200
    return UUID(response.json()["id"])


def test_create_run(admin_user: DATestUser | None, thread_id: UUID) -> None:
    response = requests.post(
        f"{RUNS_URL}/create",
        json={
            "assistant_id": "test_assistant",
            "thread_id": str(thread_id),
            "model": "gpt-3.5-turbo",
            "instructions": "Test instructions",
        },
        headers=admin_user.headers if admin_user else GENERAL_HEADERS,
    )
    assert response.status_code == 200

    response_json = response.json()
    assert "id" in response_json
    assert response_json["object"] == "thread.run"
    assert "created_at" in response_json
    assert response_json["assistant_id"] == "test_assistant"
    assert UUID(response_json["thread_id"]) == thread_id
    assert response_json["status"] == "queued"
    assert response_json["model"] == "gpt-3.5-turbo"
    assert response_json["instructions"] == "Test instructions"


def test_retrieve_run(admin_user: DATestUser | None, thread_id: UUID) -> None:
    # First, create a run
    create_response = requests.post(
        f"{RUNS_URL}/create",
        json={
            "assistant_id": "test_assistant",
            "thread_id": str(thread_id),
        },
        headers=admin_user.headers if admin_user else GENERAL_HEADERS,
    )
    assert create_response.status_code == 200
    run_id = create_response.json()["id"]

    # Now, retrieve the run
    retrieve_response = requests.get(
        f"{RUNS_URL}/{run_id}",
        headers=admin_user.headers if admin_user else GENERAL_HEADERS,
    )
    assert retrieve_response.status_code == 200

    response_json = retrieve_response.json()
    assert response_json["id"] == run_id
    assert response_json["object"] == "thread.run"
    assert "created_at" in response_json
    assert UUID(response_json["thread_id"]) == thread_id


def test_cancel_run(admin_user: DATestUser | None, thread_id: UUID) -> None:
    # First, create a run
    create_response = requests.post(
        f"{RUNS_URL}/create",
        json={
            "assistant_id": "test_assistant",
            "thread_id": str(thread_id),
        },
        headers=admin_user.headers if admin_user else GENERAL_HEADERS,
    )
    assert create_response.status_code == 200
    run_id = create_response.json()["id"]

    # Now, cancel the run
    cancel_response = requests.post(
        f"{RUNS_URL}/{run_id}/cancel",
        headers=admin_user.headers if admin_user else GENERAL_HEADERS,
    )
    assert cancel_response.status_code == 200

    response_json = cancel_response.json()
    assert response_json["id"] == run_id
    assert response_json["status"] == "cancelled"


def test_list_runs(admin_user: DATestUser | None, thread_id: UUID) -> None:
    # Create a few runs
    for _ in range(3):
        requests.post(
            f"{RUNS_URL}/create",
            json={
                "assistant_id": "test_assistant",
                "thread_id": str(thread_id),
            },
            headers=admin_user.headers if admin_user else GENERAL_HEADERS,
        )

    # Now, list the runs
    list_response = requests.get(
        f"{RUNS_URL}/thread/{thread_id}/runs",
        headers=admin_user.headers if admin_user else GENERAL_HEADERS,
    )
    assert list_response.status_code == 200

    response_json = list_response.json()
    assert isinstance(response_json, list)
    assert len(response_json) >= 3

    for run in response_json:
        assert "id" in run
        assert run["object"] == "thread.run"
        assert "created_at" in run
        assert UUID(run["thread_id"]) == thread_id
        assert "status" in run
        assert "model" in run


def test_list_run_steps(admin_user: DATestUser | None, thread_id: UUID) -> None:
    # First, create a run
    create_response = requests.post(
        f"{RUNS_URL}/create",
        json={
            "assistant_id": "test_assistant",
            "thread_id": str(thread_id),
        },
        headers=admin_user.headers if admin_user else GENERAL_HEADERS,
    )
    assert create_response.status_code == 200
    run_id = create_response.json()["id"]

    # Now, list the run steps
    steps_response = requests.get(
        f"{RUNS_URL}/{run_id}/steps",
        headers=admin_user.headers if admin_user else GENERAL_HEADERS,
    )
    assert steps_response.status_code == 200

    response_json = steps_response.json()
    assert isinstance(response_json, list)
    # Since DAnswer doesn't have an equivalent to run steps, we expect an empty list
    assert len(response_json) == 0
