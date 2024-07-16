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
  GoogleSheetsIcon
} from "@/components/icons/icons";
import { ValidSources } from "./types";
import { SourceCategory, SourceMetadata } from "./search/interfaces";
import { Persona } from "@/app/admin/assistants/interfaces";

interface PartialSourceMetadata {
  icon: React.FC<{ size?: number; className?: string }>;
  displayName: string;
  category: SourceCategory;
}

type SourceMap = {
  [K in ValidSources]: PartialSourceMetadata;
};

const SOURCE_METADATA_MAP: SourceMap = {
  web: {
    icon: GlobeIcon,
    displayName: "Web",
    category: SourceCategory.ImportedKnowledge,
  },
  gmail: {
    icon: GmailIcon,
    displayName: "Gmail",
    category: SourceCategory.AppConnection,
  },
  google_drive: {
    icon: GoogleDriveIcon,
    displayName: "Google Drive",
    category: SourceCategory.AppConnection,
  },
  github: {
    icon: GithubIcon,
    displayName: "Github",
    category: SourceCategory.AppConnection,
  },
  gitlab: {
    icon: GitlabIcon,
    displayName: "Gitlab",
    category: SourceCategory.AppConnection,
  },
  confluence: {
    icon: ConfluenceIcon,
    displayName: "Confluence",
    category: SourceCategory.AppConnection,
  },
  jira: {
    icon: JiraIcon,
    displayName: "Jira",
    category: SourceCategory.AppConnection,
  },
  notion: {
    icon: NotionIcon,
    displayName: "Notion",
    category: SourceCategory.AppConnection,
  },
  zendesk: {
    icon: ZendeskIcon,
    displayName: "Zendesk",
    category: SourceCategory.AppConnection,
  },
  productboard: {
    icon: ProductboardIcon,
    displayName: "Productboard",
    category: SourceCategory.AppConnection,
  },
  hubspot: {
    icon: HubSpotIcon,
    displayName: "HubSpot",
    category: SourceCategory.AppConnection,
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
  },
  sharepoint: {
    icon: SharepointIcon,
    displayName: "Sharepoint",
    category: SourceCategory.AppConnection,
  },
  teams: {
    icon: TeamsIcon,
    displayName: "Teams",
    category: SourceCategory.AppConnection,
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
};

function fillSourceMetadata(
  partialMetadata: PartialSourceMetadata,
  internalName: ValidSources
): SourceMetadata {
  return {
    internalName: internalName,
    ...partialMetadata,
    adminUrl: `/admin/connectors/${partialMetadata.displayName
      .toLowerCase()
      .replaceAll(" ", "-")}`,
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
  const entries = Object.entries(SOURCE_METADATA_MAP).map(
    ([source, metadata]) => {
      return fillSourceMetadata(metadata, source as ValidSources);
    }
  );
  return entries;
}

export function getSourceDisplayName(sourceType: ValidSources): string | null {
  return getSourceMetadata(sourceType).displayName;
}

export function getSourceMetadataForSources(sources: ValidSources[]) {
  return sources.map((source) => getSourceMetadata(source));
}

export function getSourcesForPersona(persona: Persona): ValidSources[] {
  const personaSources: ValidSources[] = [];
  persona.document_sets.forEach((documentSet) => {
    documentSet.cc_pair_descriptors.forEach((ccPair) => {
      if (!personaSources.includes(ccPair.connector.source)) {
        personaSources.push(ccPair.connector.source);
      }
    });
  });
  return personaSources;
}
