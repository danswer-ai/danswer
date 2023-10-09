import time
from celery.result import AsyncResult
from sqlalchemy.orm import Session

from danswer.db.engine import get_sqlalchemy_engine
from danswer.utils.logger import setup_logger
from ee.danswer.background.celery.celery import sync_user_group_task
from ee.danswer.db.user_group import fetch_user_groups

logger = setup_logger()


_ExistingTaskCache: dict[int, AsyncResult] = {}


def _user_group_sync_loop() -> None:
    # cleanup tasks
    existing_tasks = list(_ExistingTaskCache.items())
    for user_group_id, task in existing_tasks:
        if task.ready():
            logger.info(
                f"User Group '{user_group_id}' is complete with status "
                f"{task.status}. Cleaning up."
            )
            del _ExistingTaskCache[user_group_id]

    # kick off new tasks
    with Session(get_sqlalchemy_engine()) as db_session:
        # check if any document sets are not synced
        user_groups = fetch_user_groups(db_session=db_session, only_current=False)
        for user_group in user_groups:
            if not user_group.is_up_to_date:
                if user_group.id in _ExistingTaskCache:
                    logger.info(
                        f"User Group '{user_group.id}' is already syncing. Skipping."
                    )
                    continue

                logger.info(f"User Group {user_group.id} is not synced. Syncing now!")
                task = sync_user_group_task.apply_async(
                    kwargs=dict(user_group_id=user_group.id),
                )
                _ExistingTaskCache[user_group.id] = task


if __name__ == "__main__":
    while True:
        start = time.monotonic()

        _user_group_sync_loop()

        sleep_time = 30 - (time.monotonic() - start)
        if sleep_time > 0:
            time.sleep(sleep_time)
