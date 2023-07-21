import { ValidSources } from "@/lib/types";
import {
  BookstackIcon,
  ConfluenceIcon,
  FileIcon,
  GithubIcon,
  GlobeIcon,
  GoogleDriveIcon,
  JiraIcon,
  NotionIcon,
  SlabIcon,
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
    case "bookstack":
      return {
        icon: BookstackIcon,
        displayName: "BookStack",
        adminPageLink: "/admin/connectors/bookstack",
      };
    case "confluence":
      return {
        icon: ConfluenceIcon,
        displayName: "Confluence",
        adminPageLink: "/admin/connectors/confluence",
      };
    case "jira":
      return {
        icon: JiraIcon,
        displayName: "Jira",
        adminPageLink: "/admin/connectors/jira",
      };
    case "slab":
      return {
        icon: SlabIcon,
        displayName: "Slab",
        adminPageLink: "/admin/connectors/slab",
      };
    case "notion":
      return {
        icon: NotionIcon,
        displayName: "Notion",
        adminPageLink: "/admin/connectors/notion",
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
