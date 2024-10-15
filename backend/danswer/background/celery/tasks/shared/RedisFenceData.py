from datetime import datetime

from pydantic import BaseModel


class RedisFenceData(BaseModel):
    index_attempt_id: int
    num_tasks: int
    started: datetime | None
    submitted: datetime
    task_id: str
