from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib
from typing import cast

from danswer.configs.app_configs import SMTP_PASS, SMTP_PORT, SMTP_SERVER, SMTP_USER, WEB_DOMAIN
from danswer.db.models import User
from danswer.dynamic_configs.factory import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.dynamic_configs.interface import JSON_ro

USER_STORE_KEY = "INVITED_USERS"


def get_invited_users() -> list[str]:
    try:
        store = get_dynamic_config_store()
        return cast(list, store.load(USER_STORE_KEY))
    except ConfigNotFoundError:
        return list()


def write_invited_users(emails: list[str]) -> int:
    store = get_dynamic_config_store()
    store.store(USER_STORE_KEY, cast(JSON_ro, emails))
    return len(emails)

def send_user_email_invite(
    user_email: str,
    current_user : User
) -> None:
    msg = MIMEMultipart()
    msg["Subject"] = "You're invited to join a workspace @ Danswer!"
    msg["To"] = user_email
    msg["From"] = current_user.email
    link = f"{WEB_DOMAIN}/auth/signup"
    # TODO: send the name of the workspace based on the whitelabelling in the frontend\
    body = MIMEText(f"Hi!, You have been invited to join my workspace at Danswer. \
        You can register your account here and join the Danswer workspace: {link}")
    msg.attach(body)

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as s:
        s.starttls()
        # If credentials fails with gmail, check (You need an app password, not just the basic email password)
        # https://support.google.com/accounts/answer/185833?sjid=8512343437447396151-NA
        s.login(SMTP_USER, SMTP_PASS)
        s.send_message(msg)
