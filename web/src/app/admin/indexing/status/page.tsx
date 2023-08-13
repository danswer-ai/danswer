"use client";

import useSWR from "swr";

import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { LoadingAnimation } from "@/components/Loading";
import { timeAgo } from "@/lib/time";
import {
  NotebookIcon,
  QuestionIcon,
  XSquareIcon,
} from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import { getSourceMetadata } from "@/components/source";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  ConfluenceConfig,
  Connector,
  ConnectorIndexingStatus,
  GithubConfig,
  GoogleDriveConfig,
  JiraConfig,
  SlackConfig,
  WebConfig,
} from "@/lib/types";
import { useState } from "react";
import { getDocsProcessedPerMinute } from "@/lib/indexAttempt";

interface ConnectorTitleProps {
  connectorIndexingStatus: ConnectorIndexingStatus<any, any>;
}

const ConnectorTitle = ({ connectorIndexingStatus }: ConnectorTitleProps) => {
  const connector = connectorIndexingStatus.connector;
  const sourceMetadata = getSourceMetadata(connector.source);

  let additionalMetadata = new Map<string, string>();
  if (connector.source === "web") {
    const typedConnector = connector as Connector<WebConfig>;
    additionalMetadata.set(
      "Base URL",
      typedConnector.connector_specific_config.base_url
    );
  } else if (connector.source === "github") {
    const typedConnector = connector as Connector<GithubConfig>;
    additionalMetadata.set(
      "Repo",
      `${typedConnector.connector_specific_config.repo_owner}/${typedConnector.connector_specific_config.repo_name}`
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

    if (!connectorIndexingStatus.public_doc && connectorIndexingStatus.owner) {
      additionalMetadata.set("Owner", connectorIndexingStatus.owner);
    }
  } else if (connector.source === "slack") {
    const typedConnector = connector as Connector<SlackConfig>;
    if (
      typedConnector.connector_specific_config?.channels &&
      typedConnector.connector_specific_config?.channels.length > 0
    ) {
      additionalMetadata.set(
        "Channels",
        typedConnector.connector_specific_config.channels.join(", ")
      );
    }
  }

  return (
    <>
      <a
        className="text-blue-500 flex w-fit"
        href={sourceMetadata.adminPageLink}
      >
        {sourceMetadata.icon({ size: 20 })}
        <div className="ml-1">{sourceMetadata.displayName}</div>
      </a>
      <div className="text-xs text-gray-300 mt-1">
        {Array.from(additionalMetadata.entries()).map(([key, value]) => {
          return (
            <div key={key}>
              <i>{key}:</i> {value}
            </div>
          );
        })}
      </div>
    </>
  );
};

const ErrorDisplay = ({ message }: { message: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      className="relative"
    >
      {isHovered && (
        <div className="absolute pt-8 top-0 left-0">
          <div className="bg-gray-700 px-3 pb-3 pt-2 rounded shadow-lg text-xs">
            <div className="text-sm text-red-600 mb-1 flex">Error Message:</div>

            {message}
          </div>
        </div>
      )}
      <div className="text-red-600 flex cursor-default">
        <QuestionIcon className="my-auto mr-1" size={18} />
        Error
      </div>
    </div>
  );
};

function Main() {
  const {
    data: indexAttemptData,
    isLoading: indexAttemptIsLoading,
    error: indexAttemptIsError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    fetcher,
    { refreshInterval: 30000 } // 30 seconds
  );

  if (indexAttemptIsLoading) {
    return <LoadingAnimation text="" />;
  }

  if (indexAttemptIsError || !indexAttemptData) {
    return <div className="text-red-600">Error loading indexing history.</div>;
  }

  // sort by source name
  indexAttemptData.sort((a, b) => {
    if (a.connector.source < b.connector.source) {
      return -1;
    } else if (a.connector.source > b.connector.source) {
      return 1;
    } else {
      return 0;
    }
  });

  return (
    <BasicTable
      columns={[
        { header: "Connector", key: "connector" },
        { header: "Status", key: "status" },
        { header: "Last Indexed", key: "indexed_at" },
        { header: "Docs Indexed", key: "docs_indexed" },
        // { header: "Re-Index", key: "reindex" },
      ]}
      data={indexAttemptData.map((connectorIndexingStatus) => {
        const sourceMetadata = getSourceMetadata(
          connectorIndexingStatus.connector.source
        );
        let statusDisplay = (
          <div className="text-gray-400">Initializing...</div>
        );
        if (connectorIndexingStatus.connector.disabled) {
          statusDisplay = (
            <div className="text-red-600 flex">
              <XSquareIcon className="my-auto mr-1" size={18} />
              Disabled
            </div>
          );
        } else if (connectorIndexingStatus.last_status === "success") {
          statusDisplay = (
            <div className="text-green-600 flex">
              <CheckCircle className="my-auto mr-1" size="18" />
              Enabled
            </div>
          );
        } else if (connectorIndexingStatus.last_status === "failed") {
          statusDisplay = (
            <ErrorDisplay message={connectorIndexingStatus.error_msg} />
          );
        } else if (connectorIndexingStatus.last_status === "not_started") {
          statusDisplay = <div className="text-gray-400">Scheduled</div>;
        } else if (connectorIndexingStatus.last_status === "in_progress") {
          const docsPerMinute = getDocsProcessedPerMinute(
            connectorIndexingStatus.latest_index_attempt
          )?.toFixed(2);
          statusDisplay = (
            <div className="text-gray-400">
              In Progress{" "}
              {connectorIndexingStatus?.latest_index_attempt
                ?.num_docs_indexed ? (
                <div className="text-xs mt-0.5">
                  <div>
                    <i>Current Run:</i>{" "}
                    {
                      connectorIndexingStatus.latest_index_attempt
                        .num_docs_indexed
                    }{" "}
                    docs indexed
                  </div>
                  <div>
                    <i>Speed:</i>{" "}
                    {docsPerMinute ? (
                      <>~{docsPerMinute} docs / min</>
                    ) : (
                      "calculating rate..."
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          );
        }
        return {
          indexed_at: timeAgo(connectorIndexingStatus?.last_success) || "-",
          docs_indexed: connectorIndexingStatus?.docs_indexed
            ? `${connectorIndexingStatus?.docs_indexed} documents`
            : "-",
          connector: (
            <ConnectorTitle connectorIndexingStatus={connectorIndexingStatus} />
          ),
          status: statusDisplay,
          // TODO: add the below back in after this is supported in the backend
          // reindex: (
          //   <button
          //     className={
          //       "group relative " +
          //       "py-1 px-2 border border-transparent text-sm " +
          //       "font-medium rounded-md text-white bg-red-800 " +
          //       "hover:bg-red-900 focus:outline-none focus:ring-2 " +
          //       "focus:ring-offset-2 focus:ring-red-500 mx-auto"
          //     }
          //     onClick={async () => {
          //       const { message, isSuccess } = await submitIndexRequest(
          //         connectorIndexingStatus.connector.source,
          //         connectorIndexingStatus.connector
          //           .connector_specific_config
          //       );
          //       setPopup({
          //         message,
          //         type: isSuccess ? "success" : "error",
          //       });
          //       setTimeout(() => {
          //         setPopup(null);
          //       }, 4000);
          //       mutate("/api/manage/admin/connector/index-attempt");
          //     }}
          //   >
          //     Index
          //   </button>
          // ),
        };
      })}
    />
  );
}

export default function Status() {
  return (
    <div className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <NotebookIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Indexing Status</h1>
      </div>
      <Main />
    </div>
  );
}
