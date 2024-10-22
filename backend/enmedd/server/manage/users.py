import random
import re
import string
from datetime import datetime
from datetime import timedelta
from datetime import timezone
from typing import Optional

from email_validator import validate_email
from fastapi import APIRouter
from fastapi import Body
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Response
from fastapi import status
from fastapi import UploadFile
from fastapi_users.password import PasswordHelper
from file_store.file_store import get_default_file_store
from pydantic import BaseModel
from sqlalchemy import Column
from sqlalchemy import delete
from sqlalchemy import desc
from sqlalchemy import select
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from ee.enmedd.db.api_key import is_api_key_email_address
from ee.enmedd.db.external_perm import delete_user__ext_teamspace_for_user__no_commit
from ee.enmedd.db.teamspace import remove_curator_status__no_commit
from ee.enmedd.server.workspace.store import _PROFILE_FILENAME
from ee.enmedd.server.workspace.store import upload_profile
from enmedd.auth.invited_users import get_invited_users
from enmedd.auth.invited_users import write_invited_users
from enmedd.auth.noauth_user import fetch_no_auth_user
from enmedd.auth.noauth_user import set_no_auth_user_preferences
from enmedd.auth.schemas import ChangePassword
from enmedd.auth.schemas import UserRole
from enmedd.auth.schemas import UserStatus
from enmedd.auth.users import current_admin_user
from enmedd.auth.users import current_teamspace_admin_user
from enmedd.auth.users import current_user
from enmedd.auth.users import optional_user
from enmedd.auth.utils import generate_2fa_email
from enmedd.auth.utils import send_2fa_email
from enmedd.configs.app_configs import AUTH_TYPE
from enmedd.configs.app_configs import SESSION_EXPIRE_TIME_SECONDS
from enmedd.configs.app_configs import VALID_EMAIL_DOMAINS
from enmedd.configs.constants import AuthType
from enmedd.db.engine import get_async_session
from enmedd.db.engine import get_session
from enmedd.db.models import AccessToken
from enmedd.db.models import Assistant__User
from enmedd.db.models import DocumentSet__User
from enmedd.db.models import SamlAccount
from enmedd.db.models import TwofactorAuth
from enmedd.db.models import User
from enmedd.db.models import User__Teamspace
from enmedd.db.users import change_user_password
from enmedd.db.users import get_user_by_email
from enmedd.db.users import list_users
from enmedd.key_value_store.factory import get_kv_store
from enmedd.server.manage.models import AllUsersResponse
from enmedd.server.manage.models import OTPVerificationRequest
from enmedd.server.manage.models import UserByEmail
from enmedd.server.manage.models import UserInfo
from enmedd.server.manage.models import UserPreferences
from enmedd.server.manage.models import UserRoleResponse
from enmedd.server.manage.models import UserRoleUpdateRequest
from enmedd.server.models import FullUserSnapshot
from enmedd.server.models import InvitedUserSnapshot
from enmedd.server.models import MinimalUserSnapshot
from enmedd.utils.logger import setup_logger

logger = setup_logger()

router = APIRouter()


USERS_PAGE_SIZE = 10


@router.patch("/users/generate-otp")
async def generate_otp(
    current_user: User = Depends(current_user),
    db: Session = Depends(get_session),
):
    otp_code = "".join(random.choices(string.digits, k=6))

    subject, body = generate_2fa_email(current_user.full_name, otp_code)
    send_2fa_email(current_user.email, subject, body)

    existing_otp = (
        db.query(TwofactorAuth).filter(TwofactorAuth.user_id == current_user.id).first()
    )

    if existing_otp:
        existing_otp.code = otp_code
        existing_otp.created_at = datetime.now(timezone.utc)
    else:
        new_otp = TwofactorAuth(user_id=current_user.id, code=otp_code)
        db.add(new_otp)

    db.commit()

    return {"message": "OTP code generated and sent!"}


@router.post("/users/verify-otp")
async def verify_otp(
    otp_code: OTPVerificationRequest,
    current_user: User = Depends(current_user),
    db: Session = Depends(get_session),
):
    otp_code = otp_code.otp_code

    otp_entry = (
        db.query(TwofactorAuth)
        .filter(TwofactorAuth.user_id == current_user.id)
        .order_by(TwofactorAuth.created_at.desc())
        .first()
    )

    if not otp_entry:
        raise HTTPException(status_code=400, detail="No OTP found for the user.")

    if otp_entry.code != otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    expiration_time = otp_entry.created_at + timedelta(hours=6)
    if datetime.now(timezone.utc) > expiration_time:
        raise HTTPException(status_code=400, detail="OTP code has expired.")

    return {"message": "OTP verified successfully!"}


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


@router.patch("/manage/set-user-role")
def set_user_role(
    user_role_update_request: UserRoleUpdateRequest,
    current_user: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    user_to_update = get_user_by_email(
        email=user_role_update_request.user_email, db_session=db_session
    )
    if not user_to_update:
        raise HTTPException(status_code=404, detail="User not found")

    if user_role_update_request.new_role == UserRole.CURATOR:
        raise HTTPException(
            status_code=400,
            detail="Curator role must be set via the User Group Menu",
        )

    if user_to_update.role == user_role_update_request.new_role:
        return

    if current_user.id == user_to_update.id:
        raise HTTPException(
            status_code=400,
            detail="An admin cannot demote themselves from admin role!",
        )

    if user_to_update.role == UserRole.CURATOR:
        remove_curator_status__no_commit(db_session, user_to_update)

    user_to_update.role = user_role_update_request.new_role.value

    db_session.commit()


@router.get("/manage/users")
def list_all_users(
    q: str | None = None,
    accepted_page: int | None = None,
    invited_page: int | None = None,
    teamspace_id: int | None = None,
    _: User | None = Depends(current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
) -> AllUsersResponse:
    if not q:
        q = ""

    users_with_roles = []

    if teamspace_id is not None:
        users_with_roles = (
            db_session.query(User, User__Teamspace.role)
            .join(User__Teamspace)
            .filter(User__Teamspace.teamspace_id == teamspace_id)
            .all()
        )

        return AllUsersResponse(
            accepted=[
                FullUserSnapshot(
                    id=user.id,
                    email=user.email,
                    role=role,
                    status=UserStatus.LIVE
                    if user.is_active
                    else UserStatus.DEACTIVATED,
                    full_name=user.full_name,
                    billing_email_address=user.billing_email_address,
                    company_billing=user.company_billing,
                    company_email=user.company_email,
                    company_name=user.company_name,
                    vat=user.vat,
                    is_custom_profile=user.is_custom_profile,
                )
                for user, role in users_with_roles
                if not is_api_key_email_address(user.email)
            ],
            invited=[InvitedUserSnapshot(email=email) for email in get_invited_users()],
            accepted_pages=1,
            invited_pages=1,
        )
    else:
        users_with_roles = list_users(db_session, q=q)

    users_with_roles = [
        user for user in users_with_roles if not is_api_key_email_address(user.email)
    ]

    accepted_emails = {user.email for user in users_with_roles}
    invited_emails = get_invited_users()

    if q:
        invited_emails = [
            email for email in invited_emails if re.search(r"{}".format(q), email, re.I)
        ]

    accepted_count = len(accepted_emails)
    invited_count = len(invited_emails)

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
                    is_custom_profile=user.is_custom_profile,
                )
                for user in users_with_roles
            ],
            invited=[InvitedUserSnapshot(email=email) for email in invited_emails],
            accepted_pages=1,
            invited_pages=1,
        )

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
                is_custom_profile=user.is_custom_profile,
            )
            for user in users_with_roles
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
        email_info = validate_email(email)  # can raise EmailNotValidError
        normalized_emails.append(email_info.normalized)  # type: ignore
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


@router.delete("/manage/admin/delete-user")
async def delete_user(
    user_email: UserByEmail,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    user_to_delete = get_user_by_email(
        email=user_email.user_email, db_session=db_session
    )
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")

    if user_to_delete.is_active is True:
        logger.warning(
            "{} must be deactivated before deleting".format(user_to_delete.email)
        )
        raise HTTPException(
            status_code=400, detail="User must be deactivated before deleting"
        )

    # Detach the user from the current session
    db_session.expunge(user_to_delete)

    try:
        for oauth_account in user_to_delete.oauth_accounts:
            db_session.delete(oauth_account)

        delete_user__ext_teamspace_for_user__no_commit(
            db_session=db_session,
            user_id=user_to_delete.id,
        )
        db_session.query(SamlAccount).filter(
            SamlAccount.user_id == user_to_delete.id
        ).delete()
        db_session.query(DocumentSet__User).filter(
            DocumentSet__User.user_id == user_to_delete.id
        ).delete()
        db_session.query(Assistant__User).filter(
            Assistant__User.user_id == user_to_delete.id
        ).delete()
        db_session.query(User__Teamspace).filter(
            User__Teamspace.user_id == user_to_delete.id
        ).delete()
        db_session.delete(user_to_delete)
        db_session.commit()

        # NOTE: edge case may exist with race conditions
        # with this `invited user` scheme generally.
        user_emails = get_invited_users()
        remaining_users = [
            user for user in user_emails if user != user_email.user_email
        ]
        write_invited_users(remaining_users)

        logger.info(f"Deleted user {user_to_delete.email}")
    except Exception as e:
        import traceback

        full_traceback = traceback.format_exc()
        logger.error(f"Full stack trace:\n{full_traceback}")
        db_session.rollback()
        logger.error(f"Error deleting user {user_to_delete.email}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting user")


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
    return [
        MinimalUserSnapshot(
            id=user.id, email=user.email, is_custom_profile=user.is_custom_profile
        )
        for user in users
    ]


@router.get("/get-user-role")
async def get_user_role(user: User = Depends(current_user)) -> UserRoleResponse:
    if user is None:
        raise ValueError("Invalid or missing user.")
    return UserRoleResponse(role=user.role)


def get_current_token_creation(
    user: User | None, db_session: Session
) -> datetime | None:
    if user is None:
        return None
    try:
        result = db_session.execute(
            select(AccessToken)
            .where(AccessToken.user_id == user.id)  # type: ignore
            .order_by(desc(Column("created_at")))
            .limit(1)
        )
        access_token = result.scalar_one_or_none()

        if access_token:
            return access_token.created_at
        else:
            logger.error("No AccessToken found for user")
            return None

    except Exception as e:
        logger.error(f"Error fetching AccessToken: {e}")
        return None


@router.put("/me/profile")
def put_profile(
    file: UploadFile,
    db_session: Session = Depends(get_session),
    current_user: User = Depends(current_user),
) -> None:
    upload_profile(file=file, db_session=db_session, user=current_user)


@router.get("/me/profile")
def fetch_profile(
    db_session: Session = Depends(get_session),
    current_user: User = Depends(current_user),
) -> Response:
    try:
        file_path = f"{current_user.id}/{_PROFILE_FILENAME}"

        file_store = get_default_file_store(db_session)
        file_io = file_store.read_file(file_path, mode="b")

        return Response(content=file_io.read(), media_type="image/jpeg")
    except Exception:
        raise HTTPException(status_code=404, detail="No profile file found")


@router.delete("/me/profile")
def remove_profile(
    db_session: Session = Depends(get_session),
    current_user: User = Depends(current_user),  # Get the current user
) -> dict:
    try:
        file_name = f"{current_user.id}/{_PROFILE_FILENAME}"

        file_store = get_default_file_store(db_session)

        file_store.delete_file(file_name)

        current_user.is_custom_profile = False
        db_session.merge(current_user)
        db_session.commit()

        return {"detail": "Profile picture removed successfully."}
    except Exception as e:
        logger.error(f"Error removing profile picture: {str(e)}")
        raise HTTPException(status_code=404, detail="Profile picture not found.")


@router.get("/me")
def verify_user_logged_in(
    user: User | None = Depends(optional_user),
    teamspace_id: Optional[int] = None,
    db_session: Session = Depends(get_session),
) -> UserInfo:
    # NOTE: this does not use `current_user` / `current_admin_user` because we don't want
    # to enforce user verification here - the frontend always wants to get the info about
    # the current user regardless of if they are currently verified
    if user is None:
        # if auth type is disabled, return a dummy user with preferences from
        # the key-value store
        if AUTH_TYPE == AuthType.DISABLED:
            store = get_kv_store()
            return fetch_no_auth_user(store)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User Not Authenticated"
        )

    if user.oidc_expiry and user.oidc_expiry < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. User's OIDC token has expired.",
        )

    role = user.role
    if teamspace_id:
        user_teamspace = (
            db_session.query(User__Teamspace)
            .filter(
                User__Teamspace.user_id == user.id,
                User__Teamspace.teamspace_id == teamspace_id,
            )
            .first()
        )

        if user_teamspace is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teamspace or role not found",
            )

        role = user_teamspace.role

    token_created_at = get_current_token_creation(user, db_session)
    user_info = UserInfo.from_model(
        user,
        current_token_created_at=token_created_at,
        expiry_length=SESSION_EXPIRE_TIME_SECONDS,
    )
    user_info.role = role

    return user_info


"""APIs to adjust user preferences"""


class ChosenDefaultModelRequest(BaseModel):
    default_model: str | None = None


@router.patch("/user/default-model")
def update_user_default_model(
    request: ChosenDefaultModelRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    if user is None:
        if AUTH_TYPE == AuthType.DISABLED:
            store = get_kv_store()
            no_auth_user = fetch_no_auth_user(store)
            no_auth_user.preferences.default_model = request.default_model
            set_no_auth_user_preferences(store, no_auth_user.preferences)
            return
        else:
            raise RuntimeError("This should never happen")

    db_session.execute(
        update(User)
        .where(User.id == user.id)  # type: ignore
        .values(default_model=request.default_model)
    )
    db_session.commit()


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
            store = get_kv_store()

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


def update_assistant_list(
    preferences: UserPreferences, assistant_id: int, show: bool
) -> UserPreferences:
    visible_assistants = preferences.visible_assistants or []
    hidden_assistants = preferences.hidden_assistants or []
    chosen_assistants = preferences.chosen_assistants or []

    if show:
        if assistant_id not in visible_assistants:
            visible_assistants.append(assistant_id)
        if assistant_id in hidden_assistants:
            hidden_assistants.remove(assistant_id)
        if assistant_id not in chosen_assistants:
            chosen_assistants.append(assistant_id)
    else:
        if assistant_id in visible_assistants:
            visible_assistants.remove(assistant_id)
        if assistant_id not in hidden_assistants:
            hidden_assistants.append(assistant_id)
        if assistant_id in chosen_assistants:
            chosen_assistants.remove(assistant_id)

    preferences.visible_assistants = visible_assistants
    preferences.hidden_assistants = hidden_assistants
    preferences.chosen_assistants = chosen_assistants
    return preferences


@router.patch("/user/assistant-list/update/{assistant_id}")
def update_user_assistant_visibility(
    assistant_id: int,
    show: bool,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    if user is None:
        if AUTH_TYPE == AuthType.DISABLED:
            store = get_kv_store()
            no_auth_user = fetch_no_auth_user(store)
            preferences = no_auth_user.preferences
            updated_preferences = update_assistant_list(preferences, assistant_id, show)
            set_no_auth_user_preferences(store, updated_preferences)
            return
        else:
            raise RuntimeError("This should never happen")

    user_preferences = UserInfo.from_model(user).preferences
    updated_preferences = update_assistant_list(user_preferences, assistant_id, show)

    db_session.execute(
        update(User)
        .where(User.id == user.id)  # type: ignore
        .values(
            hidden_assistants=updated_preferences.hidden_assistants,
            visible_assistants=updated_preferences.visible_assistants,
            chosen_assistants=updated_preferences.chosen_assistants,
        )
    )
    db_session.commit()
