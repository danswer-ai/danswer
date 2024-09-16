from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.db.engine import get_session
from danswer.db.models import User
from ee.danswer.db.standard_answer import fetch_standard_answer
from ee.danswer.db.standard_answer import fetch_standard_answers
from ee.danswer.db.standard_answer import insert_standard_answer
from ee.danswer.db.standard_answer import remove_standard_answer
from ee.danswer.db.standard_answer import update_standard_answer
from ee.danswer.server.manage.models import StandardAnswer
from ee.danswer.server.manage.models import StandardAnswerCreationRequest

router = APIRouter(prefix="/manage")


@router.post("/admin/standard-answer")
def create_standard_answer(
    standard_answer_creation_request: StandardAnswerCreationRequest,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> StandardAnswer:
    standard_answer_model = insert_standard_answer(
        keyword=standard_answer_creation_request.keyword,
        answer=standard_answer_creation_request.answer,
        match_regex=standard_answer_creation_request.match_regex,
        match_any_keywords=standard_answer_creation_request.match_any_keywords,
        db_session=db_session,
    )
    return StandardAnswer.from_model(standard_answer_model)


@router.get("/admin/standard-answer")
def list_standard_answers(
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> list[StandardAnswer]:
    standard_answer_models = fetch_standard_answers(db_session=db_session)
    return [
        StandardAnswer.from_model(standard_answer_model)
        for standard_answer_model in standard_answer_models
    ]


@router.patch("/admin/standard-answer/{standard_answer_id}")
def patch_standard_answer(
    standard_answer_id: int,
    standard_answer_creation_request: StandardAnswerCreationRequest,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> StandardAnswer:
    existing_standard_answer = fetch_standard_answer(
        standard_answer_id=standard_answer_id,
        db_session=db_session,
    )

    if existing_standard_answer is None:
        raise HTTPException(status_code=404, detail="Standard answer not found")

    standard_answer_model = update_standard_answer(
        standard_answer_id=standard_answer_id,
        keyword=standard_answer_creation_request.keyword,
        answer=standard_answer_creation_request.answer,
        match_regex=standard_answer_creation_request.match_regex,
        match_any_keywords=standard_answer_creation_request.match_any_keywords,
        db_session=db_session,
    )
    return StandardAnswer.from_model(standard_answer_model)


@router.delete("/admin/standard-answer/{standard_answer_id}")
def delete_standard_answer(
    standard_answer_id: int,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> None:
    return remove_standard_answer(
        standard_answer_id=standard_answer_id,
        db_session=db_session,
    )
