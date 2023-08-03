import { GoogleDriveConfig } from "@/lib/types";

export const googleDriveConnectorNameBuilder = (values: GoogleDriveConfig) =>
  `GoogleDriveConnector-${
    values.folder_paths && values.folder_paths.join("_")
  }`;
