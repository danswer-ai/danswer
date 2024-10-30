UNSUPPORTED_FILE_TYPE_CONTENT = ""  # keep empty for now
DRIVE_FOLDER_TYPE = "application/vnd.google-apps.folder"
DRIVE_SHORTCUT_TYPE = "application/vnd.google-apps.shortcut"

FILE_FIELDS = "nextPageToken, files(mimeType, id, name, permissions, modifiedTime, webViewLink, shortcutDetails, owners)"
SLIM_FILE_FIELDS = "nextPageToken, files(id, permissions(emailAddress, type), permissionIds, webViewLink)"
FOLDER_FIELDS = "nextPageToken, files(id, name, permissions, modifiedTime, webViewLink, shortcutDetails)"
USER_FIELDS = "nextPageToken, users(primaryEmail)"

# these errors don't represent a failure in the connector, but simply files
# that can't / shouldn't be indexed
ERRORS_TO_CONTINUE_ON = [
    "cannotExportFile",
    "exportSizeLimitExceeded",
    "cannotDownloadFile",
]
