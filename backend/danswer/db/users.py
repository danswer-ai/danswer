from collections.abc import Sequence
from uuid import UUID

from fastapi_users.password import PasswordHelper
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy import update
from sqlalchemy.orm import Session

from danswer.auth.noauth_user import fetch_no_auth_user
from danswer.auth.noauth_user import set_no_auth_user_preferences
from danswer.auth.schemas import UserRole
from danswer.configs.app_configs import AUTH_TYPE
from danswer.configs.constants import AuthType
from danswer.db.models import Persona
from danswer.db.models import User
from danswer.db.persona import get_personas
from danswer.key_value_store.factory import get_kv_store


def list_users(
    db_session: Session, email_filter_string: str = "", user: User | None = None
) -> Sequence[User]:
    """List all users. No pagination as of now, as the # of users
    is assumed to be relatively small (<< 1 million)"""
    stmt = select(User)

    if email_filter_string:
        stmt = stmt.where(User.email.ilike(f"%{email_filter_string}%"))  # type: ignore

    return db_session.scalars(stmt).unique().all()


def get_users_by_emails(
    db_session: Session, emails: list[str]
) -> tuple[list[User], list[str]]:
    # Use distinct to avoid duplicates
    stmt = select(User).filter(User.email.in_(emails))  # type: ignore
    found_users = list(db_session.scalars(stmt).unique().all())  # Convert to list
    found_users_emails = [user.email for user in found_users]
    missing_user_emails = [email for email in emails if email not in found_users_emails]
    return found_users, missing_user_emails


def get_user_by_email(email: str, db_session: Session) -> User | None:
    user = (
        db_session.query(User)
        .filter(func.lower(User.email) == func.lower(email))
        .first()
    )

    return user


def fetch_user_by_id(db_session: Session, user_id: UUID) -> User | None:
    user = db_session.query(User).filter(User.id == user_id).first()  # type: ignore

    return user


def _generate_non_web_user(email: str) -> User:
    fastapi_users_pw_helper = PasswordHelper()
    password = fastapi_users_pw_helper.generate()
    hashed_pass = fastapi_users_pw_helper.hash(password)
    return User(
        email=email,
        hashed_password=hashed_pass,
        has_web_login=False,
        role=UserRole.BASIC,
    )


def add_non_web_user_if_not_exists(db_session: Session, email: str) -> User:
    user = get_user_by_email(email, db_session)
    if user is not None:
        return user

    user = _generate_non_web_user(email=email)
    db_session.add(user)
    db_session.commit()
    return user


def add_non_web_user_if_not_exists__no_commit(db_session: Session, email: str) -> User:
    user = get_user_by_email(email, db_session)
    if user is not None:
        return user

    user = _generate_non_web_user(email=email)
    db_session.add(user)
    db_session.flush()  # generate id
    return user


def batch_add_non_web_user_if_not_exists__no_commit(
    db_session: Session, emails: list[str]
) -> list[User]:
    found_users, missing_user_emails = get_users_by_emails(db_session, emails)

    new_users: list[User] = []
    for email in missing_user_emails:
        new_users.append(_generate_non_web_user(email=email))

    db_session.add_all(new_users)
    db_session.flush()  # generate ids

    return found_users + new_users


def get_ordered_assistants_for_user(
    user: User | None, db_session: Session
) -> list[Persona]:
    assistants = get_personas(
        db_session=db_session,
        user=user,
        include_deleted=True,
        joinedload_all=True,
    )

    def get_assistant_priority(assistant: Persona) -> tuple[int, float]:
        if user and user.chosen_assistants:
            chosen_assistants = user.chosen_assistants
            if assistant.id in chosen_assistants:
                return (0, chosen_assistants.index(assistant.id))
        return (1, assistant.display_priority or float("inf"))

    assistants.sort(key=get_assistant_priority)

    return assistants


def add_assistant_to_user_chosen_assistants(
    user: User | None, persona_id: int, db_session: Session
) -> None:
    assistant_id = persona_id
    ordered_assistants_ids = [
        assistant.id for assistant in get_ordered_assistants_for_user(user, db_session)
    ]

    if assistant_id not in ordered_assistants_ids:
        ordered_assistants_ids.append(assistant_id)

    if user is None:
        if AUTH_TYPE == AuthType.DISABLED:
            store = get_kv_store()
            no_auth_user = fetch_no_auth_user(store)
            no_auth_user.preferences.chosen_assistants = ordered_assistants_ids
            set_no_auth_user_preferences(store, no_auth_user.preferences)
            return
        else:
            raise RuntimeError("This should never happen")

    # Update the user's chosen assistants
    db_session.execute(
        update(User)
        .where(User.id == user.id)
        .values(chosen_assistants=ordered_assistants_ids)
    )
    db_session.commit()


def batch_add_non_web_user_if_not_exists(
    db_session: Session, emails: list[str]
) -> list[User]:
    found_users, missing_user_emails = get_users_by_emails(db_session, emails)

    new_users: list[User] = []
    for email in missing_user_emails:
        new_users.append(_generate_non_web_user(email=email))

    db_session.add_all(new_users)
    db_session.commit()

    return found_users + new_users
