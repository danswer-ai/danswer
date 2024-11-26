import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from sqlalchemy.orm import Session

from ee.enmedd.utils.encryption import decrypt_password
from enmedd.configs.app_configs import SMTP_PASS
from enmedd.configs.app_configs import SMTP_PORT
from enmedd.configs.app_configs import SMTP_SERVER
from enmedd.configs.app_configs import SMTP_USER
from enmedd.db.models import WorkspaceSettings
from enmedd.utils.logger import setup_logger

logger = setup_logger()


def get_smtp_credentials(workspace_id: int, db_session: Session):
    """Fetch SMTP credentials for a given workspace."""
    workspace_settings = (
        db_session.query(WorkspaceSettings)
        .filter(WorkspaceSettings.workspace_id == workspace_id)
        .first()
    )

    if not workspace_settings:
        raise ValueError(f"No SMTP settings found for workspace_id: {workspace_id}")

    smtp_server = workspace_settings.smtp_server
    smtp_port = workspace_settings.smtp_port
    smtp_user = workspace_settings.smtp_username
    smtp_password_encrypted = workspace_settings.smtp_password

    # Decrypt the password
    smtp_password = (
        decrypt_password(smtp_password_encrypted) if smtp_password_encrypted else None
    )

    return {
        "smtp_server": smtp_server,
        "smtp_port": smtp_port,
        "smtp_user": smtp_user,
        "smtp_password": smtp_password,
    }


def generate_password_reset_email(email: str, reset_url: str):
    subject = "Password Reset Request"

    body = f"""
    Dear User,

    We received a request to reset the password for your account ({email}).

    To reset your password, please click on the following link:
    {reset_url}

    This link will expire in 1 hour.

    If you did not request a password reset, please ignore this email or contact support if you have concerns.

    Best regards,
    The Arnold AI Team
    """

    return subject, body


def generate_user_verification_email(full_name: str, verify_url: str):
    subject = "Almost There! Confirm Your Email to Activate Your Account"

    body = f"""
    Hi {full_name},

    Thank you for signing up!

    To complete your registration, please verify your email address by clicking the link below
    {verify_url}

    If you did not request this email, please ignore it.

    Best regards,
    The Arnold AI Team
    """

    return subject, body


def generate_2fa_email(full_name: str, code: str):
    subject = "Arnold AI Two-Factor Authentication (2FA) Code"

    body = f"""
    <html>
    <body>
        <p>Dear {full_name},</p>
        <p>Your two-factor authentication code is: <strong>{code}</strong></p>

        <p>Please enter this code within the next 10 minutes to complete your sign-in.
        For your security, do not share this code with anyone.
        If you did not request this code, please contact our support team immediately.</p>
        <p>Best regards,</p>
        <p>The Arnold AI Team</p>
    </body>
    </html>
    """

    return subject, body


def send_user_verification_email(
    to_email: str,
    subject: str,
    body: str,
    smtp_credentials: dict,
) -> None:
    # Email configuration
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

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(message)
        print(f"Email verification sent to {to_email}")
    except Exception as e:
        print(f"Failed to send password reset email: {str(e)}")


def send_2fa_email(
    to_email: str,
    subject: str,
    body: str,
    smtp_credentials: dict,
) -> None:
    # Email configuration
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
    message.attach(MIMEText(body, "html"))

    # Send email
    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(message)
        print(f"2FA email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send 2FA email: {str(e)}")


def send_reset_password_email(
    to_email: str,
    subject: str,
    body: str,
    smtp_credentials: dict,
) -> None:
    # Email configuration
    sender_email = smtp_credentials["smtp_user"] or SMTP_USER
    sender_password = smtp_credentials["smtp_password"] or SMTP_PASS
    smtp_server = smtp_credentials["smtp_server"] or SMTP_SERVER
    smtp_port = smtp_credentials["smtp_port"] or SMTP_PORT

    logger.debug(
        f"Sending using the following email configuration: {sender_email}, {sender_password}, {smtp_server}, {smtp_port}"
    )
    logger.info(f"Sending reset password email to {to_email}")
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
        print(f"Password reset email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send password reset email: {str(e)}")
