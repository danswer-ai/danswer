UNSUPPORTED_FILE_TYPE_CONTENT = ""  # keep empty for now
DRIVE_FOLDER_TYPE = "application/vnd.google-apps.folder"
DRIVE_SHORTCUT_TYPE = "application/vnd.google-apps.shortcut"
DRIVE_FILE_TYPE = "application/vnd.google-apps.file"

FILE_FIELDS = (
    "nextPageToken, files(mimeType, id, name, permissions, modifiedTime, webViewLink, "
    "shortcutDetails, owners(emailAddress))"
)
SLIM_FILE_FIELDS = (
    "nextPageToken, files(mimeType, id, name, permissions(emailAddress, type), "
    "permissionIds, webViewLink, owners(emailAddress))"
)
FOLDER_FIELDS = "nextPageToken, files(id, name, permissions, modifiedTime, webViewLink, shortcutDetails)"
USER_FIELDS = "nextPageToken, users(primaryEmail)"

# these errors don't represent a failure in the connector, but simply files
# that can't / shouldn't be indexed
ERRORS_TO_CONTINUE_ON = [
    "cannotExportFile",
    "exportSizeLimitExceeded",
    "cannotDownloadFile",
]

# Error message substrings
MISSING_SCOPES_ERROR_STR = "client not authorized for any of the scopes requested"

# Documentation and error messages
SCOPE_DOC_URL = "https://docs.danswer.dev/connectors/google_drive/overview"
ONYX_SCOPE_INSTRUCTIONS = (
    "You have upgraded Danswer without updating the Google Drive scopes. "
    f"Please refer to the documentation to learn how to update the scopes: {SCOPE_DOC_URL}"
)

# Batch sizes
SLIM_BATCH_SIZE = 500
