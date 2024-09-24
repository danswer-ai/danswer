import re

from email_validator import validate_email
from fastapi import APIRouter
from fastapi import Body
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status
from fastapi_users.password import PasswordHelper
from pydantic import BaseModel
from sqlalchemy import delete
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from ee.enmedd.db.api_key import is_api_key_email_address
from enmedd.auth.invited_users import get_invited_users
from enmedd.auth.invited_users import send_user_email_invite
from enmedd.auth.invited_users import write_invited_users
from enmedd.auth.noauth_user import fetch_no_auth_user
from enmedd.auth.noauth_user import set_no_auth_user_preferences
from enmedd.auth.schemas import ChangePassword
from enmedd.auth.schemas import UserRole
from enmedd.auth.schemas import UserStatus
from enmedd.auth.users import current_admin_user
from enmedd.auth.users import current_user
from enmedd.auth.users import optional_user
from enmedd.configs.app_configs import AUTH_TYPE
from enmedd.configs.app_configs import VALID_EMAIL_DOMAINS
from enmedd.configs.constants import AuthType
from enmedd.db.engine import get_async_session
from enmedd.db.engine import get_session
from enmedd.db.models import AccessToken
from enmedd.db.models import User
from enmedd.db.users import change_user_password
from enmedd.db.users import get_user_by_email
from enmedd.db.users import list_users
from enmedd.dynamic_configs.factory import get_dynamic_config_store
from enmedd.server.manage.models import AllUsersResponse
from enmedd.server.manage.models import UserByEmail
from enmedd.server.manage.models import UserInfo
from enmedd.server.manage.models import UserRoleResponse
from enmedd.server.models import FullUserSnapshot
from enmedd.server.models import InvitedUserSnapshot
from enmedd.server.models import MinimalUserSnapshot
from enmedd.utils.logger import setup_logger

logger = setup_logger()

router = APIRouter()


USERS_PAGE_SIZE = 10


@router.post("/users/change-password", tags=["users"])
async def change_password(
    request: ChangePassword,
    current_user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
    async_session: AsyncSession = Depends(get_async_session),
):
    password_helper = PasswordHelper()
    verified, updated_hashed_password = password_helper.verify_and_update(
        hashed_password=current_user.hashed_password,
        plain_password=request.current_password,
    )
    if not verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    hashed_new_password = password_helper.hash(password=request.new_password)
    change_user_password(
        user_id=current_user.id, new_password=hashed_new_password, db_session=db_session
    )
    # clear all the access token for that user - automatically logging out
    # the current user on all devices
    await async_session.execute(
        delete(AccessToken).where(AccessToken.user_id == current_user.id)
    )
    await async_session.commit()
    logger.info("Password updated and tokens invalidated")


@router.patch("/manage/promote-user-to-admin")
def promote_admin(
    user_email: UserByEmail,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    user_to_promote = get_user_by_email(
        email=user_email.user_email, db_session=db_session
    )
    if not user_to_promote:
        raise HTTPException(status_code=404, detail="User not found")

    user_to_promote.role = UserRole.ADMIN
    db_session.add(user_to_promote)
    db_session.commit()


@router.patch("/manage/demote-admin-to-basic")
async def demote_admin(
    user_email: UserByEmail,
    user: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    user_to_demote = get_user_by_email(
        email=user_email.user_email, db_session=db_session
    )
    if not user_to_demote:
        raise HTTPException(status_code=404, detail="User not found")

    if user_to_demote.id == user.id:
        raise HTTPException(
            status_code=400, detail="Cannot demote yourself from admin role!"
        )

    user_to_demote.role = UserRole.BASIC
    db_session.add(user_to_demote)
    db_session.commit()


@router.get("/manage/users")
def list_all_users(
    q: str | None = None,
    accepted_page: int | None = None,
    invited_page: int | None = None,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> AllUsersResponse:
    if not q:
        q = ""

    users = [
        user
        for user in list_users(db_session, q=q)
        if not is_api_key_email_address(user.email)
    ]
    accepted_emails = {user.email for user in users}
    invited_emails = get_invited_users()
    if q:
        invited_emails = [
            email for email in invited_emails if re.search(r"{}".format(q), email, re.I)
        ]

    accepted_count = len(accepted_emails)
    invited_count = len(invited_emails)

    # If any of q, accepted_page, or invited_page is None, return all users
    if accepted_page is None or invited_page is None:
        return AllUsersResponse(
            accepted=[
                FullUserSnapshot(
                    id=user.id,
                    email=user.email,
                    role=user.role,
                    status=UserStatus.LIVE
                    if user.is_active
                    else UserStatus.DEACTIVATED,
                    full_name=user.full_name,
                    billing_email_address=user.billing_email_address,
                    company_billing=user.company_billing,
                    company_email=user.company_email,
                    company_name=user.company_name,
                    vat=user.vat,
                )
                for user in users
            ],
            invited=[InvitedUserSnapshot(email=email) for email in invited_emails],
            accepted_pages=1,
            invited_pages=1,
        )

    # Otherwise, return paginated results
    return AllUsersResponse(
        accepted=[
            FullUserSnapshot(
                id=user.id,
                email=user.email,
                role=user.role,
                status=UserStatus.LIVE if user.is_active else UserStatus.DEACTIVATED,
                full_name=user.full_name,
                billing_email_address=user.billing_email_address,
                company_billing=user.company_billing,
                company_email=user.company_email,
                company_name=user.company_name,
                vat=user.vat,
            )
            for user in users
        ][accepted_page * USERS_PAGE_SIZE : (accepted_page + 1) * USERS_PAGE_SIZE],
        invited=[InvitedUserSnapshot(email=email) for email in invited_emails][
            invited_page * USERS_PAGE_SIZE : (invited_page + 1) * USERS_PAGE_SIZE
        ],
        accepted_pages=accepted_count // USERS_PAGE_SIZE + 1,
        invited_pages=invited_count // USERS_PAGE_SIZE + 1,
    )


@router.put("/manage/admin/users")
def bulk_invite_users(
    emails: list[str] = Body(..., embed=True),
    current_user: User | None = Depends(current_admin_user),
) -> int:
    """emails are string validated. If any email fails validation, no emails are
    invited and an exception is raised."""
    if current_user is None:
        raise HTTPException(
            status_code=400, detail="Auth is disabled, cannot invite users"
        )

    normalized_emails = []
    for email in emails:
        email_info = validate_email(email)
        logger.info(f"sent email to {email_info} + {email}")
        send_user_email_invite(email, current_user)
        logger.info(f"sent email to {email_info} + {email} + {email_info.email}")
        normalized_emails.append(email_info.normalized)
    all_emails = list(set(normalized_emails) | set(get_invited_users()))
    return write_invited_users(all_emails)


@router.patch("/manage/admin/remove-invited-user")
def remove_invited_user(
    user_email: UserByEmail,
    _: User | None = Depends(current_admin_user),
) -> int:
    user_emails = get_invited_users()
    remaining_users = [user for user in user_emails if user != user_email.user_email]
    return write_invited_users(remaining_users)


@router.patch("/manage/admin/deactivate-user")
def deactivate_user(
    user_email: UserByEmail,
    current_user: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    if current_user is None:
        raise HTTPException(
            status_code=400, detail="Auth is disabled, cannot deactivate user"
        )

    if current_user.email == user_email.user_email:
        raise HTTPException(status_code=400, detail="You cannot deactivate yourself")

    user_to_deactivate = get_user_by_email(
        email=user_email.user_email, db_session=db_session
    )

    if not user_to_deactivate:
        raise HTTPException(status_code=404, detail="User not found")

    if user_to_deactivate.is_active is False:
        logger.warning("{} is already deactivated".format(user_to_deactivate.email))

    user_to_deactivate.is_active = False
    db_session.add(user_to_deactivate)
    db_session.commit()


@router.patch("/manage/admin/activate-user")
def activate_user(
    user_email: UserByEmail,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    user_to_activate = get_user_by_email(
        email=user_email.user_email, db_session=db_session
    )
    if not user_to_activate:
        raise HTTPException(status_code=404, detail="User not found")

    if user_to_activate.is_active is True:
        logger.warning("{} is already activated".format(user_to_activate.email))

    user_to_activate.is_active = True
    db_session.add(user_to_activate)
    db_session.commit()


@router.get("/manage/admin/valid-domains")
def get_valid_domains(
    _: User | None = Depends(current_admin_user),
) -> list[str]:
    return VALID_EMAIL_DOMAINS


"""Endpoints for all"""


@router.get("/users")
def list_all_users_basic_info(
    _: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> list[MinimalUserSnapshot]:
    users = list_users(db_session)
    return [MinimalUserSnapshot(id=user.id, email=user.email) for user in users]


@router.get("/get-user-role")
async def get_user_role(user: User = Depends(current_user)) -> UserRoleResponse:
    if user is None:
        raise ValueError("Invalid or missing user.")
    return UserRoleResponse(role=user.role)


@router.get("/me")
def verify_user_logged_in(
    user: User | None = Depends(optional_user),
) -> UserInfo:
    # NOTE: this does not use `current_user` / `current_admin_user` because we don't want
    # to enforce user verification here - the frontend always wants to get the info about
    # the current user regardless of if they are currently verified
    if user is None:
        # if auth type is disabled, return a dummy user with preferences from
        # the key-value store
        if AUTH_TYPE == AuthType.DISABLED:
            store = get_dynamic_config_store()
            return fetch_no_auth_user(store)

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User Not Authenticated"
        )

    return UserInfo.from_model(user)


"""APIs to adjust user preferences"""


class ChosenAssistantsRequest(BaseModel):
    chosen_assistants: list[int]


@router.patch("/user/assistant-list")
def update_user_assistant_list(
    request: ChosenAssistantsRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    if user is None:
        if AUTH_TYPE == AuthType.DISABLED:
            store = get_dynamic_config_store()

            no_auth_user = fetch_no_auth_user(store)
            no_auth_user.preferences.chosen_assistants = request.chosen_assistants
            set_no_auth_user_preferences(store, no_auth_user.preferences)
            return
        else:
            raise RuntimeError("This should never happen")

    db_session.execute(
        update(User)
        .where(User.id == user.id)  # type: ignore
        .values(chosen_assistants=request.chosen_assistants)
    )
    db_session.commit()
