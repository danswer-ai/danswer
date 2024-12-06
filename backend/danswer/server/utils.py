import json
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from io import BytesIO
from textwrap import dedent
from typing import Any

from docx import Document
from fastapi import HTTPException
from fastapi import status
from fastapi import UploadFile

from danswer.configs.app_configs import SMTP_PASS
from danswer.configs.app_configs import SMTP_PORT
from danswer.configs.app_configs import SMTP_SERVER
from danswer.configs.app_configs import SMTP_USER
from danswer.configs.app_configs import WEB_DOMAIN
from danswer.configs.constants import FileOrigin
from danswer.db.models import User
from danswer.file_store.file_store import FileStore


class BasicAuthenticationError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder that converts datetime objects to ISO format strings."""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def get_json_line(
    json_dict: dict[str, Any], encoder: type[json.JSONEncoder] = DateTimeEncoder
) -> str:
    """
    Convert a dictionary to a JSON string with datetime handling, and add a newline.

    Args:
        json_dict: The dictionary to be converted to JSON.
        encoder: JSON encoder class to use, defaults to DateTimeEncoder.

    Returns:
        A JSON string representation of the input dictionary with a newline character.
    """
    return json.dumps(json_dict, cls=encoder) + "\n"


def mask_string(sensitive_str: str) -> str:
    return "****...**" + sensitive_str[-4:]


def mask_credential_dict(credential_dict: dict[str, Any]) -> dict[str, str]:
    masked_creds = {}
    for key, val in credential_dict.items():
        if not isinstance(val, str):
            raise ValueError(
                f"Unable to mask credentials of type other than string, cannot process request."
                f"Recieved type: {type(val)}"
            )

        masked_creds[key] = mask_string(val)
    return masked_creds


def send_user_email_invite(user_email: str, current_user: User) -> None:
    msg = MIMEMultipart()
    msg["Subject"] = "Invitation to Join Danswer Workspace"
    msg["From"] = current_user.email
    msg["To"] = user_email

    email_body = dedent(
        f"""\
        Hello,

        You have been invited to join a workspace on Danswer.

        To join the workspace, please visit the following link:

        {WEB_DOMAIN}/auth/login

        Best regards,
        The Danswer Team
    """
    )

    msg.attach(MIMEText(email_body, "plain"))
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp_server:
        smtp_server.starttls()
        smtp_server.login(SMTP_USER, SMTP_PASS)
        smtp_server.send_message(msg)


def convert_docx_to_txt(file: UploadFile, file_store: FileStore, file_path: str) -> str:
    file.file.seek(0)
    docx_content = file.file.read()
    doc = Document(BytesIO(docx_content))

    # Extract text from the document
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)

    # Join the extracted text
    text_content = "\n".join(full_text)

    txt_file_path = docx_to_txt_filename(file_path)
    file_store.save_file(
        file_name=txt_file_path,
        content=BytesIO(text_content.encode("utf-8")),
        display_name=file.filename,
        file_origin=FileOrigin.CONNECTOR,
        file_type="text/plain",
    )


def docx_to_txt_filename(file_path: str) -> str:
    """
    Convert a .docx file path to its corresponding .txt file path.
    """
    return file_path.rsplit(".", 1)[0] + ".txt"
