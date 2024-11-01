import io
from datetime import datetime
from datetime import timezone

from googleapiclient.discovery import Resource  # type: ignore
from googleapiclient.errors import HttpError  # type: ignore

from danswer.configs.app_configs import CONTINUE_ON_CONNECTOR_FAILURE
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import IGNORE_FOR_QA
from danswer.connectors.google_drive.constants import DRIVE_SHORTCUT_TYPE
from danswer.connectors.google_drive.constants import ERRORS_TO_CONTINUE_ON
from danswer.connectors.google_drive.constants import UNSUPPORTED_FILE_TYPE_CONTENT
from danswer.connectors.google_drive.models import GDriveMimeType
from danswer.connectors.google_drive.models import GoogleDriveFileType
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.file_processing.extract_file_text import docx_to_text
from danswer.file_processing.extract_file_text import pptx_to_text
from danswer.file_processing.extract_file_text import read_pdf_file
from danswer.file_processing.unstructured import get_unstructured_api_key
from danswer.file_processing.unstructured import unstructured_to_text
from danswer.utils.logger import setup_logger

logger = setup_logger()


def _extract_text(file: dict[str, str], service: Resource) -> str:
    mime_type = file["mimeType"]

    if mime_type not in set(item.value for item in GDriveMimeType):
        # Unsupported file types can still have a title, finding this way is still useful
        return UNSUPPORTED_FILE_TYPE_CONTENT

    if mime_type in [
        GDriveMimeType.DOC.value,
        GDriveMimeType.PPT.value,
        GDriveMimeType.SPREADSHEET.value,
    ]:
        export_mime_type = (
            "text/plain"
            if mime_type != GDriveMimeType.SPREADSHEET.value
            else "text/csv"
        )
        return (
            service.files()
            .export(fileId=file["id"], mimeType=export_mime_type)
            .execute()
            .decode("utf-8")
        )
    elif mime_type in [
        GDriveMimeType.PLAIN_TEXT.value,
        GDriveMimeType.MARKDOWN.value,
    ]:
        return service.files().get_media(fileId=file["id"]).execute().decode("utf-8")
    if mime_type in [
        GDriveMimeType.WORD_DOC.value,
        GDriveMimeType.POWERPOINT.value,
        GDriveMimeType.PDF.value,
    ]:
        response = service.files().get_media(fileId=file["id"]).execute()
        if get_unstructured_api_key():
            return unstructured_to_text(
                file=io.BytesIO(response), file_name=file.get("name", file["id"])
            )

        if mime_type == GDriveMimeType.WORD_DOC.value:
            return docx_to_text(file=io.BytesIO(response))
        elif mime_type == GDriveMimeType.PDF.value:
            text, _ = read_pdf_file(file=io.BytesIO(response))
            return text
        elif mime_type == GDriveMimeType.POWERPOINT.value:
            return pptx_to_text(file=io.BytesIO(response))

    return UNSUPPORTED_FILE_TYPE_CONTENT


def convert_drive_item_to_document(
    file: GoogleDriveFileType, service: Resource
) -> Document | None:
    try:
        # Skip files that are shortcuts
        if file.get("mimeType") == DRIVE_SHORTCUT_TYPE:
            logger.info("Ignoring Drive Shortcut Filetype")
            return None
        try:
            text_contents = _extract_text(file, service) or ""
        except HttpError as e:
            reason = e.error_details[0]["reason"] if e.error_details else e.reason
            message = e.error_details[0]["message"] if e.error_details else e.reason
            if e.status_code == 403 and reason in ERRORS_TO_CONTINUE_ON:
                logger.warning(
                    f"Could not export file '{file['name']}' due to '{message}', skipping..."
                )
                return None

            raise

        return Document(
            id=file["webViewLink"],
            sections=[Section(link=file["webViewLink"], text=text_contents)],
            source=DocumentSource.GOOGLE_DRIVE,
            semantic_identifier=file["name"],
            doc_updated_at=datetime.fromisoformat(file["modifiedTime"]).astimezone(
                timezone.utc
            ),
            metadata={} if text_contents else {IGNORE_FOR_QA: "True"},
            additional_info=file.get("id"),
        )
    except Exception as e:
        if not CONTINUE_ON_CONNECTOR_FAILURE:
            raise e

        logger.exception("Ran into exception when pulling a file from Google Drive")
    return None
