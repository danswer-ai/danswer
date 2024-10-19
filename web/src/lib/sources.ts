import {
  ConfluenceIcon,
  DropboxIcon,
  GithubIcon,
  GitlabIcon,
  GlobeIcon,
  GmailIcon,
  GoogleDriveIcon,
  GoogleSitesIcon,
  HubSpotIcon,
  JiraIcon,
  NotionIcon,
  ProductboardIcon,
  SharepointIcon,
  TeamsIcon,
  ZendeskIcon,
  FileIcon,
  S3Icon,
  R2Icon,
  GoogleStorageIcon,
  OCIStorageIcon,
  SalesforceIcon,
  GoogleSheetsIcon,
  XenforoIcon,
} from "@/components/icons/icons";
import { ValidSources } from "./types";
import { SourceCategory, SourceMetadata } from "./search/interfaces";
import { Assistant } from "@/app/admin/assistants/interfaces";

interface PartialSourceMetadata {
  icon: React.FC<{ size?: number; className?: string }>;
  displayName: string;
  category: SourceCategory;
  docs?: string;
}

type SourceMap = {
  [K in ValidSources]: PartialSourceMetadata;
};

const SOURCE_METADATA_MAP: SourceMap = {
  web: {
    icon: GlobeIcon,
    displayName: "Web",
    category: SourceCategory.ImportedKnowledge,
    docs: "https://docs.danswer.dev/connectors/web",
  },
  gmail: {
    icon: GmailIcon,
    displayName: "Gmail",
    category: SourceCategory.AppConnection,
    docs: "https://docs.danswer.dev/connectors/gmail/overview",
  },
  google_drive: {
    icon: GoogleDriveIcon,
    displayName: "Google Drive",
    category: SourceCategory.AppConnection,
    docs: "https://docs.danswer.dev/connectors/google_drive/overview",
  },
  github: {
    icon: GithubIcon,
    displayName: "Github",
    category: SourceCategory.AppConnection,
    docs: "https://docs.danswer.dev/connectors/github",
  },
  gitlab: {
    icon: GitlabIcon,
    displayName: "Gitlab",
    category: SourceCategory.AppConnection,
    docs: "https://docs.danswer.dev/connectors/gitlab",
  },
  confluence: {
    icon: ConfluenceIcon,
    displayName: "Confluence",
    category: SourceCategory.AppConnection,
    docs: "https://docs.danswer.dev/connectors/confluence",
  },
  jira: {
    icon: JiraIcon,
    displayName: "Jira",
    category: SourceCategory.AppConnection,
    docs: "https://docs.danswer.dev/connectors/jira",
  },
  notion: {
    icon: NotionIcon,
    displayName: "Notion",
    category: SourceCategory.AppConnection,
    docs: "https://docs.danswer.dev/connectors/notion",
  },
  zendesk: {
    icon: ZendeskIcon,
    displayName: "Zendesk",
    category: SourceCategory.AppConnection,
    docs: "https://docs.danswer.dev/connectors/zendesk",
  },
  productboard: {
    icon: ProductboardIcon,
    displayName: "Productboard",
    category: SourceCategory.AppConnection,
    docs: "https://docs.danswer.dev/connectors/productboard",
  },
  hubspot: {
    icon: HubSpotIcon,
    displayName: "HubSpot",
    category: SourceCategory.AppConnection,
    docs: "https://docs.danswer.dev/connectors/hubspot",
  },
  google_sites: {
    icon: GoogleSitesIcon,
    displayName: "Google Sites",
    category: SourceCategory.Disabled,
  },
  dropbox: {
    icon: DropboxIcon,
    displayName: "Dropbox",
    category: SourceCategory.AppConnection,
    docs: "https://docs.danswer.dev/connectors/dropbox",
  },
  sharepoint: {
    icon: SharepointIcon,
    displayName: "Sharepoint",
    category: SourceCategory.AppConnection,
    docs: "https://docs.danswer.dev/connectors/sharepoint",
  },
  teams: {
    icon: TeamsIcon,
    displayName: "Teams",
    category: SourceCategory.AppConnection,
    docs: "https://docs.danswer.dev/connectors/teams",
  },
  salesforce: {
    icon: SalesforceIcon,
    displayName: "Salesforce",
    category: SourceCategory.AppConnection,
  },
  file: {
    icon: FileIcon,
    displayName: "File",
    category: SourceCategory.ImportedKnowledge,
  },
  s3: {
    icon: S3Icon,
    displayName: "AWS S3",
    category: SourceCategory.ImportedKnowledge,
  },
  r2: {
    icon: R2Icon,
    displayName: "Cloudflare R2",
    category: SourceCategory.ImportedKnowledge,
  },
  google_cloud_storage: {
    icon: GoogleStorageIcon,
    displayName: "Google Storage",
    category: SourceCategory.ImportedKnowledge,
  },
  oci_storage: {
    icon: OCIStorageIcon,
    displayName: "Oracle Storage",
    category: SourceCategory.ImportedKnowledge,
  },
  google_sheets: {
    icon: GoogleSheetsIcon,
    displayName: "Google Sheets",
    category: SourceCategory.ComingSoon,
  },
  xenforo: {
    icon: XenforoIcon,
    displayName: "Xenforo",
    category: SourceCategory.AppConnection,
  },
  ingestion_api: {
    icon: GlobeIcon,
    displayName: "Ingestion",
    category: SourceCategory.ImportedKnowledge,
  },
  // currently used for the Internet Search tool docs, which is why
  // a globe is used
  not_applicable: {
    icon: GlobeIcon,
    displayName: "Not Applicable",
    category: SourceCategory.ImportedKnowledge,
  },
} as SourceMap;

function fillSourceMetadata(
  partialMetadata: PartialSourceMetadata,
  internalName: ValidSources
): SourceMetadata {
  return {
    internalName: internalName,
    ...partialMetadata,
    adminUrl: `/admin/connectors/${internalName}`,
  };
}

export function getSourceMetadata(sourceType: ValidSources): SourceMetadata {
  const response = fillSourceMetadata(
    SOURCE_METADATA_MAP[sourceType],
    sourceType
  );

  return response;
}

export function listSourceMetadata(): SourceMetadata[] {
  /* This gives back all the viewable / common sources, primarily for 
  display in the Add Connector page */
  const entries = Object.entries(SOURCE_METADATA_MAP)
    .filter(
      ([source, _]) => source !== "not_applicable" && source != "ingestion_api"
    )
    .map(([source, metadata]) => {
      return fillSourceMetadata(metadata, source as ValidSources);
    });
  return entries;
}

export function getSourceDocLink(sourceType: ValidSources): string | null {
  return SOURCE_METADATA_MAP[sourceType].docs || null;
}
export const isValidSource = (sourceType: string) => {
  return Object.keys(SOURCE_METADATA_MAP).includes(sourceType);
};

export function getSourceDisplayName(sourceType: ValidSources): string | null {
  return getSourceMetadata(sourceType).displayName;
}

export function getSourceMetadataForSources(sources: ValidSources[]) {
  return sources.map((source) => getSourceMetadata(source));
}

export function getSourcesForAssistant(assistant: Assistant): ValidSources[] {
  const assistantSources: ValidSources[] = [];
  assistant.document_sets.forEach((documentSet) => {
    documentSet.cc_pair_descriptors.forEach((ccPair) => {
      if (!assistantSources.includes(ccPair.connector.source)) {
        assistantSources.push(ccPair.connector.source);
      }
    });
  });
  return assistantSources;
}
