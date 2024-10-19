from typing import Literal
from typing import Optional

from fastapi import APIRouter
from fastapi import Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.server.danswer_api.ingestion import api_key_dep

router = APIRouter(prefix="/runs")


class RunRequest(BaseModel):
    assistant_id: str
    thread_id: str
    model: Optional[str] = None
    instructions: Optional[str] = None
    additional_instructions: Optional[str] = None
    tools: Optional[list[dict]] = None
    metadata: Optional[dict] = None


class RunResponse(BaseModel):
    id: str
    object: str
    created_at: int
    assistant_id: str
    thread_id: str
    status: Literal[
        "queued",
        "in_progress",
        "requires_action",
        "cancelling",
        "cancelled",
        "failed",
        "completed",
        "expired",
    ]
    started_at: Optional[int] = None
    expires_at: Optional[int] = None
    cancelled_at: Optional[int] = None
    failed_at: Optional[int] = None
    completed_at: Optional[int] = None
    last_error: Optional[dict] = None
    model: str
    instructions: str
    tools: list[dict]
    file_ids: list[str]
    metadata: Optional[dict] = None


@router.post("/create")
def create_run(
    run_request: RunRequest,
    _: User | None = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> RunResponse:
    # Implementation for creating a run
    pass


@router.get("/{run_id}")
def retrieve_run(
    run_id: str,
    _: User | None = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> RunResponse:
    # Implementation for retrieving a run
    pass


@router.post("/{run_id}/cancel")
def cancel_run(
    run_id: str,
    _: User | None = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> RunResponse:
    # Implementation for cancelling a run
    pass


@router.get("/thread/{thread_id}/runs")
def list_runs(
    thread_id: str,
    limit: int = 20,
    order: Literal["asc", "desc"] = "desc",
    after: Optional[str] = None,
    before: Optional[str] = None,
    _: User | None = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> list[RunResponse]:
    # Implementation for listing runs
    pass


@router.get("/{run_id}/steps")
def list_run_steps(
    run_id: str,
    limit: int = 20,
    order: Literal["asc", "desc"] = "desc",
    after: Optional[str] = None,
    before: Optional[str] = None,
    _: User | None = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> list[dict]:  # You may want to create a specific model for run steps
    # Implementation for listing run steps
    pass


# Additional helper functions can be added here if needed
