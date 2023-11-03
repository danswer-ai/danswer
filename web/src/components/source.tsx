import { ValidSources } from "@/lib/types";
import {
  BookstackIcon,
  ConfluenceIcon,
  FileIcon,
  GithubIcon,
  GlobeIcon,
  GoogleDriveIcon,
  GuruIcon,
  GongIcon,
  JiraIcon,
  LinearIcon,
  NotionIcon,
  ProductboardIcon,
  SlabIcon,
  SlackIcon,
  ZulipIcon,
  HubSpotIcon,
  Document360Icon,
  GoogleSitesIcon,
  ZendeskIcon,
} from "./icons/icons";

interface SourceMetadata {
  icon: React.FC<{ size?: number; className?: string }>;
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
    case "productboard":
      return {
        icon: ProductboardIcon,
        displayName: "Productboard",
        adminPageLink: "/admin/connectors/productboard",
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
    case "zulip":
      return {
        icon: ZulipIcon,
        displayName: "Zulip",
        adminPageLink: "/admin/connectors/zulip",
      };
    case "guru":
      return {
        icon: GuruIcon,
        displayName: "Guru",
        adminPageLink: "/admin/connectors/guru",
      };
    case "gong":
      return {
        icon: GongIcon,
        displayName: "Gong",
        adminPageLink: "/admin/connectors/gong",
      };
    case "linear":
      return {
        icon: LinearIcon,
        displayName: "Linear",
        adminPageLink: "/admin/connectors/linear",
      };
    case "hubspot":
      return {
        icon: HubSpotIcon,
        displayName: "HubSpot",
        adminPageLink: "/admin/connectors/hubspot",
      };
    case "document360":
      return {
        icon: Document360Icon,
        displayName: "Document360",
        adminPageLink: "/admin/connectors/document360",
      };
    case "google_sites":
      return {
        icon: GoogleSitesIcon,
        displayName: "Google Sites",
        adminPageLink: "/admin/connectors/google-sites",
      };
    case "zendesk":
      return {
        icon: ZendeskIcon,
        displayName: "Zendesk",
        adminPageLink: "/admin/connectors/zendesk",
      };
    default:
      throw new Error("Invalid source type");
  }
};

export const getSourceIcon = (sourceType: ValidSources, iconSize: number) => {
  return getSourceMetadata(sourceType).icon({
    size: iconSize,
  });
};

export const getSourceDisplayName = (
  sourceType: ValidSources
): string | null => {
  return getSourceMetadata(sourceType).displayName;
};
