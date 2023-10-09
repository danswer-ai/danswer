from danswer.background.celery.celery import celery_app
from ee.danswer.user_groups.sync import sync_user_groups


@celery_app.task(soft_time_limit=60 * 60 * 6)  # 6 hour time limit
def sync_user_group_task(user_group_id: int) -> None:
    sync_user_groups(user_group_id=user_group_id)
