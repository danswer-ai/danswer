import { GoogleDriveConfig } from "@/lib/types";

export const googleDriveConnectorNameBuilder = (values: GoogleDriveConfig) =>
  `GoogleDriveConnector-${
    values.folder_paths && values.folder_paths.join("_")
  }-${values.include_shared ? "shared" : "not-shared"}-${
    values.only_org_public ? "org-public" : "all"
  }-${
    values.follow_shortcuts ? "follow-shortcuts" : "do-not-follow-shortcuts"
  }`;
