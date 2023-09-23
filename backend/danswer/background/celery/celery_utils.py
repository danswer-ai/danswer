import json

from celery.result import AsyncResult
from sqlalchemy import text
from sqlalchemy.orm import Session

from danswer.background.celery.celery import celery_app
from danswer.db.engine import get_sqlalchemy_engine


def get_celery_task(task_id: str) -> AsyncResult:
    """NOTE: even if the task doesn't exist, celery will still return something
    with a `PENDING` state"""
    return AsyncResult(task_id, backend=celery_app.backend)


def get_celery_task_status(task_id: str) -> str | None:
    """NOTE: is tightly coupled to the internals of kombu (which is the
    translation layer to allow us to use Postgres as a broker). If we change
    the broker, this will need to be updated.

    This should not be called on any critical flows.
    """
    # first check for any pending tasks
    with Session(get_sqlalchemy_engine()) as session:
        rows = session.execute(text("SELECT payload FROM kombu_message WHERE visible"))
        for row in rows:
            payload = json.loads(row[0])
            if payload["headers"]["id"] == task_id:
                return "PENDING"

    task = get_celery_task(task_id)
    # if not pending, then we know the task really exists
    if task.status != "PENDING":
        return task.status

    return None
