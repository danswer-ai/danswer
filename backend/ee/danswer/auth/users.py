from fastapi import HTTPException
from fastapi import Request
from fastapi import status
from sqlalchemy.orm import Session

from danswer.configs.app_configs import AUTH_TYPE
from danswer.configs.app_configs import DISABLE_AUTH
from danswer.configs.constants import AuthType
from danswer.db.models import User
from danswer.utils.logger import setup_logger
from ee.danswer.db.saml import get_saml_account
from ee.danswer.utils.secrets import extract_hashed_cookie

logger = setup_logger()


def verify_auth_setting() -> None:
    # All the Auth flows are valid for EE version
    logger.info(f"Using Auth Type: {AUTH_TYPE.value}")


async def double_check_user(
    request: Request,
    user: User | None,
    db_session: Session,
    optional: bool = DISABLE_AUTH,
) -> User | None:
    if optional:
        return None

    # Check if the user has a session cookie from SAML
    if AUTH_TYPE == AuthType.SAML:
        saved_cookie = extract_hashed_cookie(request)

        if saved_cookie:
            saml_account = get_saml_account(cookie=saved_cookie, db_session=db_session)
            user = saml_account.user if saml_account else None

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. User is not authenticated.",
        )

    return user
