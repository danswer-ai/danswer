import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import cast

from enmedd.configs.app_configs import EMAIL_FROM
from enmedd.configs.app_configs import SMTP_PASS
from enmedd.configs.app_configs import SMTP_PORT
from enmedd.configs.app_configs import SMTP_SERVER
from enmedd.configs.app_configs import SMTP_USER
from enmedd.key_value_store.factory import get_kv_store
from enmedd.key_value_store.interface import JSON_ro
from enmedd.key_value_store.interface import KvKeyNotFoundError

USER_STORE_KEY = "INVITED_USERS"


def get_invited_users() -> list[str]:
    try:
        store = get_kv_store()
        return cast(list, store.load(USER_STORE_KEY))
    except KvKeyNotFoundError:
        return list()


def write_invited_users(emails: list[str]) -> int:
    store = get_kv_store()
    store.store(USER_STORE_KEY, cast(JSON_ro, emails))
    return len(emails)


def generate_invite_email(signup_link: str):
    subject = "You're Invite to Join The AI Platform - Activate Your Account Now!"

    body = f"""
    Hi,

    We're excited to invite you to join The AI Platform!

    To get started, simply click the link below to activate your account
    {signup_link}

    If you didn't request this invitation or believe this email was sent by mistake, please disregard it.

    If you have any questions or need assistance, feel free to reach out to our support team at tech@arnoldai.io.

    We look forward to having you with us!

    Best regards,
    The AI Platform Team
    """

    return subject, body


def send_invite_user_email(
    to_email: str, subject: str, body: str, mail_from: str = EMAIL_FROM
) -> None:
    sender_email = SMTP_USER
    sender_password = SMTP_PASS
    smtp_server = SMTP_SERVER
    smtp_port = SMTP_PORT

    # Create MIME message
    message = MIMEMultipart()
    message["To"] = to_email
    message["Subject"] = subject
    if mail_from:
        message["From"] = mail_from
    message.attach(MIMEText(body, "plain"))

    # Send email
    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(message)
        print(f"Invite email has been send to {to_email}")
    except Exception as e:
        print(f"Failed to send email invitation to {to_email}: {str(e)}")
