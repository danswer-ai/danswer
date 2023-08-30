import contextlib
import os
import smtplib
import uuid
from collections.abc import AsyncGenerator
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from fastapi import Depends
from fastapi import HTTPException
from fastapi import Request
from fastapi import status
from fastapi_users import BaseUserManager
from fastapi_users import FastAPIUsers
from fastapi_users import models
from fastapi_users import schemas
from fastapi_users import UUIDIDMixin
from fastapi_users.authentication import AuthenticationBackend
from fastapi_users.authentication import CookieTransport
from fastapi_users.authentication.strategy.db import AccessTokenDatabase
from fastapi_users.authentication.strategy.db import DatabaseStrategy
from fastapi_users.db import SQLAlchemyUserDatabase
from httpx_oauth.clients.google import GoogleOAuth2
from httpx_oauth.clients.openid import OpenID
from pydantic import EmailStr

from danswer.auth.schemas import UserCreate
from danswer.auth.schemas import UserRole
from danswer.configs.app_configs import DISABLE_AUTH
from danswer.configs.app_configs import ENABLE_OAUTH
from danswer.configs.app_configs import OAUTH_CLIENT_ID
from danswer.configs.app_configs import OAUTH_CLIENT_SECRET
from danswer.configs.app_configs import OAUTH_TYPE
from danswer.configs.app_configs import OPENID_CONFIG_URL
from danswer.configs.app_configs import REQUIRE_EMAIL_VERIFICATION
from danswer.configs.app_configs import SECRET
from danswer.configs.app_configs import SESSION_EXPIRE_TIME_SECONDS
from danswer.configs.app_configs import SMTP_PASS
from danswer.configs.app_configs import SMTP_PORT
from danswer.configs.app_configs import SMTP_SERVER
from danswer.configs.app_configs import SMTP_USER
from danswer.configs.app_configs import VALID_EMAIL_DOMAINS
from danswer.configs.app_configs import WEB_DOMAIN
from danswer.db.auth import get_access_token_db
from danswer.db.auth import get_user_count
from danswer.db.auth import get_user_db
from danswer.db.engine import get_async_session
from danswer.db.models import AccessToken
from danswer.db.models import User
from danswer.utils.logger import setup_logger

logger = setup_logger()

FAKE_USER_EMAIL = "fakeuser@fakedanswermail.com"
FAKE_USER_PASS = "foobar"

USER_WHITELIST_FILE = "/home/danswer_whitelist.txt"
_user_whitelist: list[str] | None = None


def get_user_whitelist() -> list[str]:
    global _user_whitelist
    if _user_whitelist is None:
        if os.path.exists(USER_WHITELIST_FILE):
            with open(USER_WHITELIST_FILE, "r") as file:
                _user_whitelist = [line.strip() for line in file]
        else:
            _user_whitelist = []

    return _user_whitelist


def verify_email_in_whitelist(email: str) -> None:
    whitelist = get_user_whitelist()
    if (whitelist and email not in whitelist) or not email:
        raise PermissionError("User not on allowed user whitelist")


def verify_email_domain(email: str) -> None:
    if VALID_EMAIL_DOMAINS:
        if email.count("@") != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is not valid",
            )
        domain = email.split("@")[-1]
        if domain not in VALID_EMAIL_DOMAINS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email domain is not valid",
            )


def send_user_verification_email(user_email: str, token: str) -> None:
    msg = MIMEMultipart()
    msg["Subject"] = "Danswer Email Verification"
    msg["From"] = "no-reply@danswer.dev"
    msg["To"] = user_email

    link = f"{WEB_DOMAIN}/verify-email?token={token}"

    body = MIMEText(f"Click the following link to verify your email address: {link}")
    msg.attach(body)

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as s:
        s.starttls()
        # If credentials fails with gmail, check (You need an app password, not just the basic email password)
        # https://support.google.com/accounts/answer/185833?sjid=8512343437447396151-NA
        s.login(SMTP_USER, SMTP_PASS)
        s.send_message(msg)


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    async def create(
        self,
        user_create: schemas.UC | UserCreate,
        safe: bool = False,
        request: Optional[Request] = None,
    ) -> models.UP:
        verify_email_in_whitelist(user_create.email)
        verify_email_domain(user_create.email)
        if hasattr(user_create, "role"):
            user_count = await get_user_count()
            if user_count == 0:
                user_create.role = UserRole.ADMIN
            else:
                user_create.role = UserRole.BASIC
        return await super().create(user_create, safe=safe, request=request)  # type: ignore

    async def oauth_callback(
        self: "BaseUserManager[models.UOAP, models.ID]",
        oauth_name: str,
        access_token: str,
        account_id: str,
        account_email: str,
        expires_at: Optional[int] = None,
        refresh_token: Optional[str] = None,
        request: Optional[Request] = None,
        *,
        associate_by_email: bool = False,
        is_verified_by_default: bool = False,
    ) -> models.UOAP:
        verify_email_in_whitelist(account_email)
        verify_email_domain(account_email)

        return await super().oauth_callback(  # type: ignore
            oauth_name=oauth_name,
            access_token=access_token,
            account_id=account_id,
            account_email=account_email,
            expires_at=expires_at,
            refresh_token=refresh_token,
            request=request,
            associate_by_email=associate_by_email,
            is_verified_by_default=is_verified_by_default,
        )

    async def on_after_register(
        self, user: User, request: Optional[Request] = None
    ) -> None:
        logger.info(f"User {user.id} has registered.")

    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Request] = None
    ) -> None:
        logger.info(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Request] = None
    ) -> None:
        verify_email_domain(user.email)

        logger.info(
            f"Verification requested for user {user.id}. Verification token: {token}"
        )

        send_user_verification_email(user.email, token)


async def get_user_manager(
    user_db: SQLAlchemyUserDatabase = Depends(get_user_db),
) -> AsyncGenerator[UserManager, None]:
    yield UserManager(user_db)


cookie_transport = CookieTransport(cookie_max_age=SESSION_EXPIRE_TIME_SECONDS)


def get_database_strategy(
    access_token_db: AccessTokenDatabase[AccessToken] = Depends(get_access_token_db),
) -> DatabaseStrategy:
    return DatabaseStrategy(
        access_token_db, lifetime_seconds=SESSION_EXPIRE_TIME_SECONDS  # type: ignore
    )


auth_backend = AuthenticationBackend(
    name="database",
    transport=cookie_transport,
    get_strategy=get_database_strategy,
)

oauth_client = None  # type: GoogleOAuth2 | OpenID | None
if ENABLE_OAUTH:
    if OAUTH_TYPE == "google":
        oauth_client = GoogleOAuth2(OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET)
    elif OAUTH_TYPE == "openid":
        oauth_client = OpenID(OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OPENID_CONFIG_URL)
    else:
        raise AssertionError(f"Invalid OAUTH type {OAUTH_TYPE}")


fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [auth_backend])


# Currently unused, maybe useful later
async def create_get_fake_user() -> User:
    get_async_session_context = contextlib.asynccontextmanager(
        get_async_session
    )  # type:ignore
    get_user_db_context = contextlib.asynccontextmanager(get_user_db)
    get_user_manager_context = contextlib.asynccontextmanager(get_user_manager)

    logger.info("Creating fake user due to Auth being turned off")
    async with get_async_session_context() as session:
        async with get_user_db_context(session) as user_db:
            async with get_user_manager_context(user_db) as user_manager:
                user = await user_manager.get_by_email(FAKE_USER_EMAIL)
                if user:
                    return user
                user = await user_manager.create(
                    UserCreate(email=EmailStr(FAKE_USER_EMAIL), password=FAKE_USER_PASS)
                )
                logger.info("Created fake user.")
                return user


current_active_user = fastapi_users.current_user(
    active=True, verified=REQUIRE_EMAIL_VERIFICATION, optional=DISABLE_AUTH
)


async def current_user(user: User = Depends(current_active_user)) -> User | None:
    if DISABLE_AUTH:
        return None
    return user


async def current_admin_user(user: User = Depends(current_user)) -> User | None:
    if DISABLE_AUTH:
        return None

    if not user or not hasattr(user, "role") or user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. User is not an admin.",
        )
    return user
