from uuid import UUID

from fastapi import HTTPException
from fastapi_users.password import PasswordHelper
from sqlalchemy import func
from sqlalchemy import not_
from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.auth.schemas import UserRole
from danswer.auth.schemas import UserStatus
from danswer.db.api_key import DANSWER_API_KEY_DUMMY_EMAIL_DOMAIN
from danswer.db.models import User
from danswer.server.models import AcceptedUsersReturn


def validate_user_role_update(requested_role: UserRole, current_role: UserRole) -> None:
    """
    Validate that a user role update is valid.
    Assumed only admins can hit this endpoint.
    raise if:
    - requested role is a curator
    - requested role is a slack user
    - requested role is an external permissioned user
    - requested role is a limited user
    - current role is a slack user
    - current role is an external permissioned user
    - current role is a limited user
    """

    if current_role == UserRole.SLACK_USER:
        raise HTTPException(
            status_code=400,
            detail="To change a Slack User's role, they must first login to Danswer via the web app.",
        )

    if current_role == UserRole.EXT_PERM_USER:
        # This shouldn't happen, but just in case
        raise HTTPException(
            status_code=400,
            detail="To change an External Permissioned User's role, they must first login to Danswer via the web app.",
        )

    if current_role == UserRole.LIMITED:
        raise HTTPException(
            status_code=400,
            detail="To change a Limited User's role, they must first login to Danswer via the web app.",
        )

    if requested_role == UserRole.CURATOR:
        # This shouldn't happen, but just in case
        raise HTTPException(
            status_code=400,
            detail="Curator role must be set via the User Group Menu",
        )

    if requested_role == UserRole.LIMITED:
        # This shouldn't happen, but just in case
        raise HTTPException(
            status_code=400,
            detail=(
                "A user cannot be set to a Limited User role. "
                "This role is automatically assigned to users through certain endpoints in the API."
            ),
        )

    if requested_role == UserRole.SLACK_USER:
        # This shouldn't happen, but just in case
        raise HTTPException(
            status_code=400,
            detail=(
                "A user cannot be set to a Slack User role. "
                "This role is automatically assigned to users who only use Danswer via Slack."
            ),
        )

    if requested_role == UserRole.EXT_PERM_USER:
        # This shouldn't happen, but just in case
        raise HTTPException(
            status_code=400,
            detail=(
                "A user cannot be set to an External Permissioned User role. "
                "This role is automatically assigned to users who have been "
                "pulled in to the system via an external permissions system."
            ),
        )


def list_users(
    db_session: Session,
    limit: int,
    offset: int,
    email_filter_string: str = "",
    status_filter: UserStatus | None = None,
    roles_filter: list[UserRole] = [],
    include_external: bool = False,
) -> AcceptedUsersReturn:
    users_stmt = select(User)

    where_clause = []

    where_clause.append(not_(User.email.endswith(DANSWER_API_KEY_DUMMY_EMAIL_DOMAIN)))

    if not include_external:
        where_clause.append(User.role != UserRole.EXT_PERM_USER)

    if email_filter_string:
        where_clause.append(User.email.ilike(f"%{email_filter_string}%"))  # type: ignore

    if roles_filter:
        where_clause.append(User.role.in_(roles_filter))

    if status_filter:
        where_clause.append(User.is_active == (status_filter == UserStatus.LIVE))

    users_stmt = users_stmt.where(*where_clause).limit(limit).offset(offset)
    users = db_session.scalars(users_stmt).unique().all()

    total_count_stmt = select(func.count()).select_from(User).where(*where_clause)
    total_count = db_session.scalar(total_count_stmt)

    return {"users": users, "total_count": total_count}


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
    return db_session.query(User).filter(User.id == user_id).first()  # type: ignore


def _generate_non_web_slack_user(email: str) -> User:
    fastapi_users_pw_helper = PasswordHelper()
    password = fastapi_users_pw_helper.generate()
    hashed_pass = fastapi_users_pw_helper.hash(password)
    return User(
        email=email,
        hashed_password=hashed_pass,
        role=UserRole.SLACK_USER,
    )


def add_slack_user_if_not_exists(db_session: Session, email: str) -> User:
    email = email.lower()
    user = get_user_by_email(email, db_session)
    if user is not None:
        # If the user is an external permissioned user, we update it to a slack user
        if user.role == UserRole.EXT_PERM_USER:
            user.role = UserRole.SLACK_USER
            db_session.commit()
        return user

    user = _generate_non_web_slack_user(email=email)
    db_session.add(user)
    db_session.commit()
    return user


def _generate_non_web_permissioned_user(email: str) -> User:
    fastapi_users_pw_helper = PasswordHelper()
    password = fastapi_users_pw_helper.generate()
    hashed_pass = fastapi_users_pw_helper.hash(password)
    return User(
        email=email,
        hashed_password=hashed_pass,
        role=UserRole.EXT_PERM_USER,
    )


def batch_add_ext_perm_user_if_not_exists(
    db_session: Session, emails: list[str]
) -> list[User]:
    emails = [email.lower() for email in emails]
    found_users, missing_user_emails = get_users_by_emails(db_session, emails)

    new_users: list[User] = []
    for email in missing_user_emails:
        new_users.append(_generate_non_web_permissioned_user(email=email))

    db_session.add_all(new_users)
    db_session.commit()

    return found_users + new_users
