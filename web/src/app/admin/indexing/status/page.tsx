"use client";

import useSWR from "swr";

import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { LoadingAnimation } from "@/components/Loading";
import { timeAgo } from "@/lib/time";
import { NotebookIcon, XSquareIcon } from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import { getSourceMetadata } from "@/components/source";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { ConnectorIndexingStatus } from "@/lib/types";

const getSourceDisplay = (
  connectorIndexingStatus: ConnectorIndexingStatus<any>
) => {
  const connector = connectorIndexingStatus.connector;
  const sourceMetadata = getSourceMetadata(connector.source);
  if (connector.source === "web") {
    return (
      sourceMetadata.displayName +
      (connector.connector_specific_config?.base_url &&
        ` [${connector.connector_specific_config?.base_url}]`)
    );
  }

  if (connector.source === "github") {
    return (
      sourceMetadata.displayName +
      ` [${connector.connector_specific_config?.repo_owner}/${connector.connector_specific_config?.repo_name}]`
    );
  }

  if (connector.source === "confluence") {
    return (
      sourceMetadata.displayName +
      ` [${connector.connector_specific_config?.wiki_page_url}]`
    );
  }

  if (connector.source === "jira") {
    return (
      sourceMetadata.displayName +
      ` [${connector.connector_specific_config?.jira_project_url}]`
    );
  }

  if (
    connector.source === "google_drive" &&
    !connectorIndexingStatus.public_doc
  ) {
    if (connectorIndexingStatus.owner) {
      return `${sourceMetadata.displayName} [${connectorIndexingStatus.owner}]`;
    }
    return `${sourceMetadata.displayName} [private]`;
  }

  return sourceMetadata.displayName;
};

function Main() {
  const {
    data: indexAttemptData,
    isLoading: indexAttemptIsLoading,
    error: indexAttemptIsError,
  } = useSWR<ConnectorIndexingStatus<any>[]>(
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
        let statusDisplay = <div className="text-gray-400">In Progress...</div>;
        if (connectorIndexingStatus.connector.disabled) {
          statusDisplay = (
            <div className="text-red-600 flex">
              <XSquareIcon className="my-auto mr-1" size="18" />
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
            <div className="text-red-600 flex">
              <XCircle className="my-auto mr-1" size="18" />
              Error
            </div>
          );
        }
        return {
          indexed_at: timeAgo(connectorIndexingStatus?.last_success) || "-",
          docs_indexed: connectorIndexingStatus?.docs_indexed
            ? `${connectorIndexingStatus?.docs_indexed} documents`
            : "-",
          connector: (
            <a
              className="text-blue-500 flex"
              href={sourceMetadata.adminPageLink}
            >
              {sourceMetadata.icon({ size: "20" })}
              <div className="ml-1">
                {getSourceDisplay(connectorIndexingStatus)}
              </div>
            </a>
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
        <NotebookIcon size="32" />
        <h1 className="text-3xl font-bold pl-2">Indexing Status</h1>
      </div>
      <Main />
    </div>
  );
}
