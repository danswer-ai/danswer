import { ValidSources } from "@/lib/types";
import {
  ConfluenceIcon,
  FileIcon,
  GithubIcon,
  GlobeIcon,
  GoogleDriveIcon,
  SlackIcon,
} from "./icons/icons";

interface SourceMetadata {
  icon: React.FC<{ size?: string; className?: string }>;
  displayName: string;
  adminPageLink: string;
}

export const getSourceMetadata = (sourceType: ValidSources): SourceMetadata => {
  switch (sourceType) {
    case "web":
      return {
        icon: GlobeIcon,
        displayName: "Web",
        adminPageLink: "/admin/connectors/web",
      };
    case "file":
      return {
        icon: FileIcon,
        displayName: "File",
        adminPageLink: "/admin/connectors/file",
      };
    case "slack":
      return {
        icon: SlackIcon,
        displayName: "Slack",
        adminPageLink: "/admin/connectors/slack",
      };
    case "google_drive":
      return {
        icon: GoogleDriveIcon,
        displayName: "Google Drive",
        adminPageLink: "/admin/connectors/google-drive",
      };
    case "github":
      return {
        icon: GithubIcon,
        displayName: "Github PRs",
        adminPageLink: "/admin/connectors/github",
      };
    case "confluence":
      return {
        icon: ConfluenceIcon,
        displayName: "Confluence",
        adminPageLink: "/admin/connectors/confluence",
      };
    default:
      throw new Error("Invalid source type");
  }
};

export const getSourceIcon = (sourceType: ValidSources, iconSize: string) => {
  return getSourceMetadata(sourceType).icon({
    size: iconSize,
  });
};

export const getSourceDisplayName = (
  sourceType: ValidSources
): string | null => {
  return getSourceMetadata(sourceType).displayName;
};
