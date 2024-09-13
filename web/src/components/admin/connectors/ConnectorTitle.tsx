import { CustomTooltip } from "@/components/CustomTooltip";
import { getSourceMetadata } from "@/lib/sources";
import {
  ConfluenceConfig,
  Connector,
  GithubConfig,
  GitlabConfig,
  GoogleDriveConfig,
  JiraConfig,
} from "@/lib/types";
import Link from "next/link";

interface ConnectorTitleProps {
  connector: Connector<any>;
  ccPairId: number;
  ccPairName: string | null | undefined;
  isPublic?: boolean;
  owner?: string;
  isLink?: boolean;
  showMetadata?: boolean;
}

export const ConnectorTitle = ({
  connector,
  ccPairId,
  ccPairName,
  owner,
  isPublic = true,
  isLink = true,
  showMetadata = true,
}: ConnectorTitleProps) => {
  const sourceMetadata = getSourceMetadata(connector.source);

  let additionalMetadata = new Map<string, string>();
  if (connector.source === "github") {
    const typedConnector = connector as Connector<GithubConfig>;
    additionalMetadata.set(
      "Repo",
      `${typedConnector.connector_specific_config.repo_owner}/${typedConnector.connector_specific_config.repo_name}`
    );
  } else if (connector.source === "gitlab") {
    const typedConnector = connector as Connector<GitlabConfig>;
    additionalMetadata.set(
      "Repo",
      `${typedConnector.connector_specific_config.project_owner}/${typedConnector.connector_specific_config.project_name}`
    );
  } else if (connector.source === "confluence") {
    const typedConnector = connector as Connector<ConfluenceConfig>;
    additionalMetadata.set(
      "Wiki URL",
      typedConnector.connector_specific_config.wiki_page_url
    );
  } else if (connector.source === "jira") {
    const typedConnector = connector as Connector<JiraConfig>;
    additionalMetadata.set(
      "Jira Project URL",
      typedConnector.connector_specific_config.jira_project_url
    );
  } else if (connector.source === "google_drive") {
    const typedConnector = connector as Connector<GoogleDriveConfig>;
    if (
      typedConnector.connector_specific_config?.folder_paths &&
      typedConnector.connector_specific_config?.folder_paths.length > 0
    ) {
      additionalMetadata.set(
        "Folders",
        typedConnector.connector_specific_config.folder_paths.join(", ")
      );
    }

    if (!isPublic && owner) {
      additionalMetadata.set("Owner", owner);
    }
  }

  const mainSectionClassName = "flex w-fit";
  const mainDisplay = (
    <CustomTooltip
      trigger={
        <div className="flex items-center gap-1">
          {sourceMetadata.icon({ size: 14 })}
          <div className="ml-1 my-auto max-w-[350px] truncate">
            {ccPairName || sourceMetadata.displayName}
          </div>
        </div>
      }
      asChild
    >
      {ccPairName || sourceMetadata.displayName}
    </CustomTooltip>
  );
  return (
    <div className="my-auto">
      {isLink ? (
        <Link
          className={mainSectionClassName}
          href={`/admin/connector/${ccPairId}`}
        >
          {mainDisplay}
        </Link>
      ) : (
        <div className={mainSectionClassName}>{mainDisplay}</div>
      )}
      {showMetadata && additionalMetadata.size > 0 && (
        <div className="text-xs mt-1">
          {Array.from(additionalMetadata.entries()).map(([key, value]) => {
            return (
              <div key={key}>
                <i>{key}:</i> {value}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
