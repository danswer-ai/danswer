from datetime import datetime

from pydantic import BaseModel


class RedisConnectorIndexingFenceData(BaseModel):
    index_attempt_id: int
    started: datetime | None
    submitted: datetime
    celery_task_id: str
