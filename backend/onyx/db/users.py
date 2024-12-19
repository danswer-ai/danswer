from collections.abc import Sequence
from uuid import UUID

from fastapi import HTTPException
from fastapi_users.password import PasswordHelper
from sqlalchemy import func
from sqlalchemy import not_
from sqlalchemy import select
from sqlalchemy.orm import Session

from onyx.auth.schemas import UserRole
from onyx.auth.schemas import UserStatus
from onyx.db.api_key import DANSWER_API_KEY_DUMMY_EMAIL_DOMAIN
from onyx.db.models import User


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
            detail="To change a Slack User's role, they must first login to Onyx via the web app.",
        )

    if current_role == UserRole.EXT_PERM_USER:
        # This shouldn't happen, but just in case
        raise HTTPException(
            status_code=400,
            detail="To change an External Permissioned User's role, they must first login to Onyx via the web app.",
        )

    if current_role == UserRole.LIMITED:
        raise HTTPException(
            status_code=400,
            detail="To change a Limited User's role, they must first login to Onyx via the web app.",
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
                "This role is automatically assigned to users who only use Onyx via Slack."
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


def get_all_users(
    db_session: Session, email_filter_string: str = "", include_external: bool = False
) -> Sequence[User]:
    """List all users. No pagination as of now, as the # of users
    is assumed to be relatively small (<< 1 million)"""
    stmt = select(User)

    where_clause = []

    if not include_external:
        where_clause.append(User.role != UserRole.EXT_PERM_USER)

    if email_filter_string:
        where_clause.append(User.email.ilike(f"%{email_filter_string}%"))  # type: ignore

    stmt = stmt.where(*where_clause)

    return db_session.scalars(stmt).unique().all()


def _get_accepted_user_where_clause(
    email_filter_string: str = "",
    status_filter: UserStatus | None = None,
    roles_filter: list[UserRole] = [],
    include_external: bool = False,
) -> list:
    # Init where clause and remove any users with API email domains
    where_clause = [not_(User.email.endswith(DANSWER_API_KEY_DUMMY_EMAIL_DOMAIN))]

    # Exclude external permissioned users
    if not include_external:
        where_clause.append(User.role != UserRole.EXT_PERM_USER)

    if email_filter_string:
        where_clause.append(User.email.ilike(f"%{email_filter_string}%"))

    if roles_filter:
        where_clause.append(User.role.in_(roles_filter))

    # When status_filter = "live" the inner condition evaluates True, if status_filter is "deactivated" we get False.
    # so if status_filter = "live" we select only active users, and if status_filter = "deactivated" we select only inactive users
    if status_filter:
        where_clause.append(User.is_active == (status_filter == UserStatus.LIVE))

    return where_clause


def get_page_of_filtered_users(
    db_session: Session,
    page_size: int,
    page: int,
    email_filter_string: str = "",
    status_filter: UserStatus | None = None,
    roles_filter: list[UserRole] = [],
    include_external: bool = False,
) -> Sequence[User]:
    users_stmt = select(User)

    where_clause = _get_accepted_user_where_clause(
        email_filter_string=email_filter_string,
        status_filter=status_filter,
        roles_filter=roles_filter,
        include_external=include_external,
    )
    # Apply pagination
    users_stmt = users_stmt.offset((page - 1) * page_size).limit(page_size)
    # Apply filtering
    users_stmt = users_stmt.where(*where_clause)

    return db_session.scalars(users_stmt).unique().all()


def get_total_filtered_users_count(
    db_session: Session,
    email_filter_string: str = "",
    status_filter: UserStatus | None = None,
    roles_filter: list[UserRole] = [],
    include_external: bool = False,
) -> int:
    where_clause = _get_accepted_user_where_clause(
        email_filter_string=email_filter_string,
        status_filter=status_filter,
        roles_filter=roles_filter,
        include_external=include_external,
    )
    total_count_stmt = select(func.count()).select_from(User)
    # Apply filtering
    total_count_stmt = total_count_stmt.where(*where_clause)

    return db_session.scalar(total_count_stmt)


def get_user_by_email(email: str, db_session: Session) -> User | None:
    user = (
        db_session.query(User)
        .filter(func.lower(User.email) == func.lower(email))
        .first()
    )
    return user


def fetch_user_by_id(db_session: Session, user_id: UUID) -> User | None:
    return db_session.query(User).filter(User.id == user_id).first()  # type: ignore


def _generate_slack_user(email: str) -> User:
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

    user = _generate_slack_user(email=email)
    db_session.add(user)
    db_session.commit()
    return user


def _get_users_by_emails(
    db_session: Session, lower_emails: list[str]
) -> tuple[list[User], list[str]]:
    stmt = select(User).filter(func.lower(User.email).in_(lower_emails))  # type: ignore
    found_users = list(db_session.scalars(stmt).unique().all())  # Convert to list

    # Extract found emails and convert to lowercase to avoid case sensitivity issues
    found_users_emails = [user.email.lower() for user in found_users]

    # Separate emails for users that were not found
    missing_user_emails = [
        email for email in lower_emails if email not in found_users_emails
    ]
    return found_users, missing_user_emails


def _generate_ext_permissioned_user(email: str) -> User:
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
    lower_emails = [email.lower() for email in emails]
    found_users, missing_lower_emails = _get_users_by_emails(db_session, lower_emails)

    new_users: list[User] = []
    for email in missing_lower_emails:
        new_users.append(_generate_ext_permissioned_user(email=email))

    db_session.add_all(new_users)
    db_session.commit()

    return found_users + new_users
