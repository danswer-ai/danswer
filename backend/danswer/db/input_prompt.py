from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.db.models import InputPrompt
from danswer.db.models import User
from danswer.server.features.input_prompt.models import InputPromptSnapshot
from danswer.server.manage.models import UserInfo
from danswer.utils.logger import setup_logger

logger = setup_logger()


def insert_input_prompt(
    prompt: str, content: str, user: User | None, db_session: Session
) -> InputPrompt:
    input_prompt = InputPrompt(
        prompt=prompt,
        content=content,
        active=True,
        user_id=user.id if user is not None else None,
    )
    db_session.add(input_prompt)
    db_session.commit()

    return input_prompt


def update_input_prompt(
    user: User | None,
    input_prompt_id: int,
    prompt: str,
    content: str,
    active: bool,
    db_session: Session,
) -> InputPrompt:
    input_prompt = db_session.scalar(
        select(InputPrompt).where(InputPrompt.id == input_prompt_id)
    )
    if input_prompt is None:
        raise ValueError(f"No input prompt with id {input_prompt_id}")

    if not validate_user_prompt_authorization(user, input_prompt):
        raise HTTPException(status_code=401, detail="You don't own this prompt")

    input_prompt.prompt = prompt
    input_prompt.content = content
    input_prompt.active = active

    db_session.commit()

    return input_prompt


def validate_user_prompt_authorization(
    user: User | None, input_prompt: InputPrompt
) -> bool:
    prompt = InputPromptSnapshot.from_model(input_prompt=input_prompt)
    if prompt.user_id is not None:
        if user is None:
            return False

        user_details = UserInfo.from_model(user)
        if user_details.id != prompt.user_id:
            return False

    return True


def remove_input_prompt(
    user: User | None, input_prompt_id: int, db_session: Session
) -> None:
    input_prompt = db_session.scalar(
        select(InputPrompt).where(InputPrompt.id == input_prompt_id)
    )
    if input_prompt is None:
        raise ValueError(f"No input prompt with id {input_prompt_id}")

    if not validate_user_prompt_authorization(user, input_prompt):
        raise HTTPException(status_code=401, detail="You do not own this prompt")

    db_session.delete(input_prompt)
    db_session.commit()


def fetch_input_prompt_by_id(
    id: int, user_id: UUID | None, db_session: Session
) -> InputPrompt:
    query = select(InputPrompt).where(InputPrompt.id == id)

    if user_id:
        query = query.where(
            (InputPrompt.user_id == user_id) | (InputPrompt.user_id is None)
        )
    else:
        # If no user_id is provided, only fetch prompts without a user_id (aka public)
        query = query.where(InputPrompt.user_id == None)  # noqa

    result = db_session.scalar(query)

    if result is None:
        raise HTTPException(422, "No input prompt found")

    return result


def fetch_input_prompts_by_user(
    db_session: Session,
    user_id: UUID | None,
    active: bool | None = None,
) -> list[InputPrompt]:
    query = select(InputPrompt)

    if user_id is not None:
        query = query.where(InputPrompt.user_id == user_id)

    if active is not None:
        query = query.where(InputPrompt.active == active)

    return list(db_session.scalars(query).all())
