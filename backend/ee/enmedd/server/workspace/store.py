import io
import os
from io import BytesIO
from typing import Any
from typing import cast
from typing import IO

from dotenv import load_dotenv
from fastapi import HTTPException
from fastapi import UploadFile
from PIL import Image
from sqlalchemy.orm import Session

from ee.enmedd.server.workspace.models import AnalyticsScriptUpload
from ee.enmedd.server.workspace.models import Workspaces
from enmedd.configs.constants import FileOrigin
from enmedd.configs.constants import KV_ENTERPRISE_SETTINGS_KEY
from enmedd.configs.constants import QUALITY
from enmedd.configs.constants import SIZE
from enmedd.db.models import Teamspace
from enmedd.db.models import User
from enmedd.db.models import Workspace
from enmedd.file_store.file_store import get_default_file_store
from enmedd.key_value_store.factory import get_kv_store
from enmedd.key_value_store.interface import KvKeyNotFoundError
from enmedd.utils.logger import setup_logger

load_dotenv()
# TODO : replace the value name
logger = setup_logger()

_CUSTOM_ANALYTICS_SCRIPT_KEY = "__custom_analytics_script__"
_CUSTOM_ANALYTICS_SECRET_KEY = os.environ.get("CUSTOM_ANALYTICS_SECRET_KEY")


def load_analytics_script() -> str | None:
    dynamic_config_store = get_kv_store()
    try:
        return cast(str, dynamic_config_store.load(_CUSTOM_ANALYTICS_SCRIPT_KEY))
    except KvKeyNotFoundError:
        return None


def store_settings(settings: Workspaces) -> None:
    get_kv_store().store(KV_ENTERPRISE_SETTINGS_KEY, settings.model_dump())


_CUSTOM_ANALYTICS_SECRET_KEY = os.environ.get("CUSTOM_ANALYTICS_SECRET_KEY")


def store_analytics_script(analytics_script_upload: AnalyticsScriptUpload) -> None:
    if (
        not _CUSTOM_ANALYTICS_SECRET_KEY
        or analytics_script_upload.secret_key != _CUSTOM_ANALYTICS_SECRET_KEY
    ):
        raise ValueError("Invalid secret key")

    get_kv_store().store(_CUSTOM_ANALYTICS_SCRIPT_KEY, analytics_script_upload.script)


_LOGO_FILENAME = "__logo__"
_HEADERLOGO_FILENAME = "__header_logo__"
_TEAMSPACELOGO_FILENAME = "__teamspace_logo__"
_LOGOTYPE_FILENAME = "__logotype__"
_PROFILE_FILENAME = "__profile__"


def is_valid_file_type(filename: str) -> bool:
    valid_extensions = (".png", ".jpg", ".jpeg")
    return filename.endswith(valid_extensions)


def guess_file_type(filename: str) -> str:
    if filename.lower().endswith(".png"):
        return "image/png"
    elif filename.lower().endswith(".jpg") or filename.lower().endswith(".jpeg"):
        return "image/jpeg"
    return "application/octet-stream"


def upload_logo(
    db_session: Session,
    file: UploadFile | str,
    workspace_id: int,
    is_logotype: bool = False,
) -> bool:
    content: IO[Any]

    workspace = db_session.query(Workspace).filter_by(id=workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if isinstance(file, str):
        logger.info(f"Uploading logo from local path {file}")
        if not os.path.isfile(file):
            logger.error("File does not exist")
            return False

        with open(file, "rb") as file_handle:
            file_content = file_handle.read()
        content = BytesIO(file_content)
        display_name = file
        file_type = guess_file_type(file)

    else:
        logger.info("Uploading logo from uploaded file")
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded.")

        try:
            image = Image.open(file.file)
            image.verify()

            file.file.seek(0)
            image = Image.open(file.file)

            max_size = SIZE
            image.thumbnail(max_size)

            img_byte_arr = io.BytesIO()
            image_format = image.format or "JPEG"
            image.save(img_byte_arr, format=image_format, quality=QUALITY)
            img_byte_arr.seek(0)
            content = img_byte_arr

            display_name = file.filename
            file_type = file.content_type or f"image/{image_format.lower()}"

        except Exception as e:
            logger.error(f"Error processing image: {e}")
            raise HTTPException(status_code=400, detail="Invalid image file.")

    file_name = f"{workspace_id}{_LOGOTYPE_FILENAME if is_logotype else _LOGO_FILENAME}"

    file_store = get_default_file_store(db_session)
    file_store.save_file(
        file_name=file_name,
        content=content,
        display_name=display_name,
        file_origin=FileOrigin.OTHER,
        file_type=file_type,
    )

    workspace.custom_logo = file_name
    db_session.merge(workspace)
    db_session.commit()

    return True


def upload_header_logo(
    db_session: Session,
    file: UploadFile | str,
    workspace_id: int,
) -> bool:
    content: IO[Any]

    workspace = db_session.query(Workspace).filter_by(id=workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if isinstance(file, str):
        logger.info(f"Uploading header logo from local path {file}")
        if not os.path.isfile(file):
            logger.error("File does not exist")
            return False

        with open(file, "rb") as file_handle:
            file_content = file_handle.read()
        content = BytesIO(file_content)
        display_name = file
        file_type = guess_file_type(file)

    else:
        logger.info("Uploading header logo from uploaded file")
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded.")

        try:
            image = Image.open(file.file)
            image.verify()

            file.file.seek(0)
            image = Image.open(file.file)

            max_size = SIZE
            image.thumbnail(max_size)

            img_byte_arr = io.BytesIO()
            image_format = image.format or "JPEG"
            image.save(img_byte_arr, format=image_format, quality=QUALITY)
            img_byte_arr.seek(0)
            content = img_byte_arr

            display_name = file.filename
            file_type = file.content_type or f"image/{image_format.lower()}"

        except Exception as e:
            logger.error(f"Error processing image: {e}")
            raise HTTPException(status_code=400, detail="Invalid image file.")

    file_name = f"{workspace_id}{_HEADERLOGO_FILENAME}"

    file_store = get_default_file_store(db_session)
    file_store.save_file(
        file_name=file_name,
        content=content,
        display_name=display_name,
        file_origin=FileOrigin.OTHER,
        file_type=file_type,
    )

    workspace.custom_header_logo = file_name
    db_session.merge(workspace)
    db_session.commit()

    return True


def upload_profile(db_session: Session, file: UploadFile | str, user: User) -> bool:
    content: IO[Any]

    if isinstance(file, str):
        logger.info(f"Uploading profile from local path {file}")
        if not os.path.isfile(file):
            logger.error("File does not exist")
            return False

        with open(file, "rb") as file_handle:
            file_content = file_handle.read()
        content = BytesIO(file_content)
        display_name = file
        file_type = guess_file_type(file)

    else:
        logger.info("Uploading profile from uploaded file")
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded.")

        try:
            image = Image.open(file.file)
            image.verify()

            file.file.seek(0)
            image = Image.open(file.file)

            max_size = SIZE
            image.thumbnail(max_size)

            img_byte_arr = io.BytesIO()
            image_format = image.format or "JPEG"
            image.save(img_byte_arr, format=image_format, quality=QUALITY)
            img_byte_arr.seek(0)
            content = img_byte_arr

            display_name = file.filename
            file_type = file.content_type or f"image/{image_format.lower()}"

        except Exception as e:
            logger.error(f"Error processing image: {e}")
            raise HTTPException(status_code=400, detail="Invalid image file.")

    file_name = f"{user.id}{_PROFILE_FILENAME}"

    file_store = get_default_file_store(db_session)
    file_store.save_file(
        file_name=file_name,
        content=content,
        display_name=display_name,
        file_origin=FileOrigin.OTHER,
        file_type=file_type,
    )
    user.profile = file_name
    db_session.merge(user)
    db_session.commit()

    return True


def upload_teamspace_logo(
    db_session: Session,
    teamspace_id: int,
    file: UploadFile | str,
) -> bool:
    content: IO[Any]

    teamspace = db_session.query(Teamspace).filter_by(id=teamspace_id).first()
    if not teamspace:
        raise HTTPException(status_code=404, detail="Teamspace not found")

    if isinstance(file, str):
        logger.info(f"Uploading teamspace logo from local path {file}")
        if not os.path.isfile(file):
            logger.error("File does not exist")
            return False

        with open(file, "rb") as file_handle:
            file_content = file_handle.read()
        content = BytesIO(file_content)
        display_name = file
        file_type = guess_file_type(file)

    else:
        logger.info("Uploading teamspace logo from uploaded file")
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded.")

        try:
            image = Image.open(file.file)
            image.verify()

            file.file.seek(0)
            image = Image.open(file.file)

            max_size = SIZE
            image.thumbnail(max_size)

            img_byte_arr = io.BytesIO()
            image_format = image.format or "JPEG"
            image.save(img_byte_arr, format=image_format, quality=QUALITY)
            img_byte_arr.seek(0)
            content = img_byte_arr

            display_name = file.filename
            file_type = file.content_type or f"image/{image_format.lower()}"

        except Exception as e:
            logger.error(f"Error processing image: {e}")
            raise HTTPException(status_code=400, detail="Invalid image file.")

    file_name = f"{teamspace_id}{_TEAMSPACELOGO_FILENAME}"

    file_store = get_default_file_store(db_session)
    file_store.save_file(
        file_name=file_name,
        content=content,
        display_name=display_name,
        file_origin=FileOrigin.OTHER,
        file_type=file_type,
    )

    teamspace.logo = file_name
    db_session.merge(teamspace)
    db_session.commit()

    return True
