import smtplib
import uuid
from collections.abc import AsyncGenerator
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from danswer.auth.schemas import UserCreate
from danswer.auth.schemas import UserRole
from danswer.configs.app_configs import APP_DOMAIN
from danswer.configs.app_configs import DISABLE_AUTH
from danswer.configs.app_configs import GOOGLE_OAUTH_CLIENT_ID
from danswer.configs.app_configs import GOOGLE_OAUTH_CLIENT_SECRET
from danswer.configs.app_configs import REQUIRE_EMAIL_VERIFICATION
from danswer.configs.app_configs import SECRET
from danswer.configs.app_configs import SESSION_EXPIRE_TIME_SECONDS
from danswer.configs.app_configs import SMTP_SERVER
from danswer.configs.app_configs import VALID_EMAIL_DOMAIN
from danswer.db.auth import get_access_token_db
from danswer.db.auth import get_user_count
from danswer.db.auth import get_user_db
from danswer.db.models import AccessToken
from danswer.db.models import User
from danswer.utils.logging import setup_logger
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

logger = setup_logger()


def send_user_verification_email(user_email: str, token: str) -> None:
    msg = MIMEMultipart()
    msg["Subject"] = "Danswer Email Verification"
    msg["From"] = "no-reply@danswer.dev"
    msg["To"] = user_email

    link = f"{APP_DOMAIN}/verify?token={token}"

    body = MIMEText(f"Click the following link to verify your email address: {link}")
    msg.attach(body)

    with smtplib.SMTP(SMTP_SERVER) as s:
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
        if hasattr(user_create, "role"):
            user_count = await get_user_count()
            if user_count == 0:
                user_create.role = UserRole.ADMIN
            else:
                user_create.role = UserRole.BASIC
        return await super().create(user_create, safe=safe, request=request)  # type: ignore

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
        if VALID_EMAIL_DOMAIN:
            if user.email.count("@") != 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email is not valid",
                )
            domain = user.email.split("@")[-1]
            if domain != VALID_EMAIL_DOMAIN:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email domain is not valid",
                )

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

google_oauth_client = GoogleOAuth2(GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET)

fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [auth_backend])

current_active_user = fastapi_users.current_user(
    active=True, verified=REQUIRE_EMAIL_VERIFICATION, optional=DISABLE_AUTH
)


def current_admin_user(user: User = Depends(current_active_user)) -> User | None:
    if DISABLE_AUTH:
        return None
    if not user or not hasattr(user, "role") or user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. User is not an admin.",
        )
    return user
