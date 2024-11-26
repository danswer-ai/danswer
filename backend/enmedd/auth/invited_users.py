import smtplib
from datetime import datetime
from datetime import timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import cast
from typing import Optional

import jwt
from fastapi import HTTPException
from sqlalchemy.orm import Session

from enmedd.configs.app_configs import SECRET_KEY
from enmedd.configs.app_configs import SMTP_PASS
from enmedd.configs.app_configs import SMTP_PORT
from enmedd.configs.app_configs import SMTP_SERVER
from enmedd.configs.app_configs import SMTP_USER
from enmedd.db.models import InviteToken
from enmedd.key_value_store.factory import get_kv_store
from enmedd.key_value_store.interface import JSON_ro
from enmedd.key_value_store.interface import KvKeyNotFoundError

USER_STORE_KEY = "INVITED_USERS"
TEAMSPACE_INVITE_USER = "TEAMSPACE_INVITE_USER"


def get_invited_users(teamspace_id: int = None) -> list[str]:
    try:
        store = get_kv_store()

        if teamspace_id:
            teamspace_users = cast(dict, store.load(TEAMSPACE_INVITE_USER))

            if str(teamspace_id) in teamspace_users:
                return teamspace_users[str(teamspace_id)]
            else:
                return []
        else:
            return cast(list, store.load(USER_STORE_KEY))
    except KvKeyNotFoundError:
        return list()


def write_invited_users(emails: list[str], teamspace_id: Optional[int] = None) -> int:
    store = get_kv_store()

    if teamspace_id:
        try:
            teamspace_users = store.load(TEAMSPACE_INVITE_USER)
        except KvKeyNotFoundError:
            teamspace_users = {}

        teamspace_users[str(teamspace_id)] = emails

        store.store(TEAMSPACE_INVITE_USER, cast(JSON_ro, teamspace_users))

    else:
        store.store(USER_STORE_KEY, cast(JSON_ro, emails))

    return len(emails)


def generate_invite_token(
    teamspace_id: Optional[int], emails: list[str], db_session: Session
) -> str:
    # Define token expiration (e.g., 1 day)
    expiration = datetime.utcnow() + timedelta(hours=24)

    payload = {"teamspace_id": teamspace_id, "exp": expiration}

    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

    invite_token = InviteToken(token=token, emails=emails)
    db_session.add(invite_token)
    db_session.commit()

    return token


def decode_invite_token(token: str, email: str, db_session: Session):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])

        teamspace_id = payload.get("teamspace_id")

        invite_token = db_session.query(InviteToken).filter_by(token=token).first()
        if not invite_token:
            raise HTTPException(status_code=400, detail="Invalid token")

        if invite_token.emails:
            if email not in invite_token.emails:
                raise HTTPException(
                    status_code=400,
                    detail="Email not associated with this invite token",
                )

        return teamspace_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid token")


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
    to_email: str,
    subject: str,
    body: str,
    smtp_credentials: dict,
) -> None:
    sender_email = smtp_credentials["smtp_user"] or SMTP_USER
    sender_password = smtp_credentials["smtp_password"] or SMTP_PASS
    smtp_server = smtp_credentials["smtp_server"] or SMTP_SERVER
    smtp_port = smtp_credentials["smtp_port"] or SMTP_PORT

    # Create MIME message
    message = MIMEMultipart()
    message["To"] = to_email
    message["Subject"] = subject
    if sender_email:
        message["From"] = sender_email
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
