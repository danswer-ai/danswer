import io
from datetime import datetime
from datetime import timezone
from typing import Any

from googleapiclient.discovery import build  # type: ignore
from googleapiclient.errors import HttpError  # type: ignore
from markitdown import MarkItDown  # type: ignore

from onyx.configs.app_configs import CONTINUE_ON_CONNECTOR_FAILURE
from onyx.configs.constants import DocumentSource
from onyx.configs.constants import IGNORE_FOR_QA
from onyx.connectors.google_drive.constants import DRIVE_FOLDER_TYPE
from onyx.connectors.google_drive.constants import DRIVE_SHORTCUT_TYPE
from onyx.connectors.google_drive.constants import UNSUPPORTED_FILE_TYPE_CONTENT
from onyx.connectors.google_drive.models import GDriveMimeType
from onyx.connectors.google_drive.models import GoogleDriveFileType
from onyx.connectors.google_drive.section_extraction import get_document_sections
from onyx.connectors.google_utils.resources import GoogleDocsService
from onyx.connectors.google_utils.resources import GoogleDriveService
from onyx.connectors.models import Document
from onyx.connectors.models import Section
from onyx.connectors.models import SlimDocument
from onyx.file_processing.unstructured import get_unstructured_api_key
from onyx.file_processing.unstructured import unstructured_to_text
from onyx.utils.logger import setup_logger

logger = setup_logger()


# these errors don't represent a failure in the connector, but simply files
# that can't / shouldn't be indexed
ERRORS_TO_CONTINUE_ON = [
    "cannotExportFile",
    "exportSizeLimitExceeded",
    "cannotDownloadFile",
]


def _extract_sections_basic(
    file_meta: dict[str, Any], service: GoogleDriveService
) -> list[Section]:
    """
    Extracts text from a Google Drive file based on its MIME type.

    This function handles different file types:
    - Google Sheets are processed using specialized logic via the Sheets API
    - Other Google formats use MarkItDown when possible
    - If configured, falls back to Unstructured for text extraction

    The function returns a list of Section objects, each containing a link and the extracted text.

    file_meta: Dict with file metadata (id, name, mimeType, webViewLink)
    service: Authorized GoogleDriveService instance

    Returns: List of Section objects
    """
    mime_type = file_meta["mimeType"]
    link = file_meta["webViewLink"]
    file_id = file_meta["id"]

    # If mime_type not recognized, fallback to at least returning something with the link.
    if mime_type not in {item.value for item in GDriveMimeType}:
        return [Section(link=link, text=UNSUPPORTED_FILE_TYPE_CONTENT)]

    # Handle Google Sheets separately
    if mime_type == GDriveMimeType.SPREADSHEET.value:
        # Attempt Sheets API extraction
        try:
            return _extract_google_sheets(file_meta, service)
        except Exception as e:
            logger.warning(
                f"Ran into exception '{e}' when pulling data from Google "
                f"Sheet '{file_meta['name']}'. Falling back to basic extraction."
            )

    # From here on, either it’s not a spreadsheet or the spreadsheet extraction failed.
    # Try exporting the file for Drive’s native formats or just downloading for
    # non-native MS Office/PDF, etc.
    try:
        # If it's a Google-native doc or ppt, we can export to text/plain.
        # If it's a Google-native spreadsheet (and we reached here), we treat it as text/csv.
        drive_export_mime = None
        if mime_type in [
            GDriveMimeType.DOC.value,
            GDriveMimeType.PPT.value,
            GDriveMimeType.SPREADSHEET.value,
        ]:
            # Decide on export type
            drive_export_mime = (
                "text/csv"
                if mime_type == GDriveMimeType.SPREADSHEET.value
                else "text/plain"
            )
            content = (
                service.files()
                .export(fileId=file_id, mimeType=drive_export_mime)
                .execute()
            )
        else:
            # Non-native files (e.g., PDF, MS Word, etc.) -> direct download
            content = service.files().get_media(fileId=file_id).execute()

        print(type(content))
        print("THAT WAS THE TYPE OF THE CONTENT")
        # Convert the content to text via MarkItDown or Unstructured
        text_extracted = _convert_gdrive_content_to_text(content, file_meta)
        return [Section(link=link, text=text_extracted)]

    except Exception:
        logger.exception("Unexpected error extracting text from file.")
        return [Section(link=link, text=UNSUPPORTED_FILE_TYPE_CONTENT)]


def _extract_google_sheets(
    file_meta: dict[str, Any], service: GoogleDriveService
) -> list[Section]:
    """
    Specialized extraction logic for Google Sheets.
    Iterates through each sheet, fetches all data, and returns a list of Section objects.

    file_meta: The Google Drive file metadata dictionary.
    service: A GoogleDriveService instance with Sheets API authorized credentials.

    Returns: List of Section objects, each corresponding to one sheet in the spreadsheet.
    """
    link = file_meta["webViewLink"]
    file_id = file_meta["id"]

    sheets_service = build("sheets", "v4", credentials=service._http.credentials)
    spreadsheet = sheets_service.spreadsheets().get(spreadsheetId=file_id).execute()

    sections: list[Section] = []
    for sheet in spreadsheet["sheets"]:
        sheet_name = sheet["properties"]["title"]
        sheet_id = sheet["properties"]["sheetId"]

        grid_props = sheet["properties"].get("gridProperties", {})
        row_count = grid_props.get("rowCount", 1000)
        column_count = grid_props.get("columnCount", 26)

        # Convert a number to a spreadsheet column letter (1->A, 26->Z, 27->AA,...)
        end_column = ""
        col_count = column_count
        while col_count > 0:
            col_count, remainder = divmod(col_count - 1, 26)
            end_column = chr(65 + remainder) + end_column

        range_name = f"'{sheet_name}'!A1:{end_column}{row_count}"

        try:
            result = (
                sheets_service.spreadsheets()
                .values()
                .get(spreadsheetId=file_id, range=range_name)
                .execute()
            )
            values = result.get("values", [])

            if values:
                text = f"Sheet: {sheet_name}\n"
                for row in values:
                    text += "\t".join(str(cell) for cell in row) + "\n"

                sections.append(Section(link=f"{link}#gid={sheet_id}", text=text))
        except HttpError as e:
            logger.warning(f"Error fetching data for sheet '{sheet_name}': {e}")
            # Continue with next sheet
            continue

    return sections


def _convert_gdrive_content_to_text(content: bytes, file_meta: dict[str, Any]) -> str:
    """
    Converts raw bytes from a Google Drive "export" or "get_media" to text.
    Tries Unstructured first if available, otherwise uses MarkItDown.
    This method does not deal with Google Sheets (handled separately).

    :param content: Raw bytes from Google Drive export or direct media download.
    :param file_meta: Metadata of the file including its name and ID.
    :return: Extracted text.
    """
    file_name = file_meta.get("name", "")  # Or something like "Unknown_file"
    if get_unstructured_api_key():
        try:
            return unstructured_to_text(io.BytesIO(content), file_name)
        except Exception as e:
            logger.warning(
                f"Unstructured parsing failed for {file_name}; "
                f"falling back to MarkItDown. Reason: {str(e)}"
            )
    print("CONTENT IS")
    print(content)

    print("TYPE IS")
    print(type(content))
    # Fallback to MarkItDown
    md = MarkItDown()
    result = md.convert(io.BytesIO(content))
    print("RESULT IS")
    print(result)
    return result.text_content


def convert_drive_item_to_document(
    file: GoogleDriveFileType,
    drive_service: GoogleDriveService,
    docs_service: GoogleDocsService,
) -> Document | None:
    try:
        # Skip files that are shortcuts
        if file.get("mimeType") == DRIVE_SHORTCUT_TYPE:
            logger.info("Ignoring Drive Shortcut Filetype")
            return None
        # Skip files that are folders
        if file.get("mimeType") == DRIVE_FOLDER_TYPE:
            logger.info("Ignoring Drive Folder Filetype")
            return None

        sections: list[Section] = []

        # Special handling for Google Docs to preserve structure, link
        # to headers
        if file.get("mimeType") == GDriveMimeType.DOC.value:
            try:
                sections = get_document_sections(docs_service, file["id"])
            except Exception as e:
                logger.warning(
                    f"Ran into exception '{e}' when pulling sections from Google Doc '{file['name']}'."
                    " Falling back to basic extraction."
                )
        # NOTE: this will run for either (1) the above failed or (2) the file is not a Google Doc
        if not sections:
            try:
                # For all other file types just extract the text
                sections = _extract_sections_basic(file, drive_service)

            except HttpError as e:
                reason = e.error_details[0]["reason"] if e.error_details else e.reason
                message = e.error_details[0]["message"] if e.error_details else e.reason
                if e.status_code == 403 and reason in ERRORS_TO_CONTINUE_ON:
                    logger.warning(
                        f"Could not export file '{file['name']}' due to '{message}', skipping..."
                    )
                    return None

                raise
        if not sections:
            return None

        return Document(
            id=file["webViewLink"],
            sections=sections,
            source=DocumentSource.GOOGLE_DRIVE,
            semantic_identifier=file["name"],
            doc_updated_at=datetime.fromisoformat(file["modifiedTime"]).astimezone(
                timezone.utc
            ),
            metadata={}
            if any(section.text for section in sections)
            else {IGNORE_FOR_QA: "True"},
            additional_info=file.get("id"),
        )
    except Exception as e:
        if not CONTINUE_ON_CONNECTOR_FAILURE:
            raise e

        logger.exception("Ran into exception when pulling a file from Google Drive")
    return None


def build_slim_document(file: GoogleDriveFileType) -> SlimDocument | None:
    # Skip files that are folders or shortcuts
    if file.get("mimeType") in [DRIVE_FOLDER_TYPE, DRIVE_SHORTCUT_TYPE]:
        return None

    return SlimDocument(
        id=file["webViewLink"],
        perm_sync_data={
            "doc_id": file.get("id"),
            "permissions": file.get("permissions", []),
            "permission_ids": file.get("permissionIds", []),
            "name": file.get("name"),
            "owner_email": file.get("owners", [{}])[0].get("emailAddress"),
        },
    )
