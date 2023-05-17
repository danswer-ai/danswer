"use client";

import useSWR, { useSWRConfig } from "swr";

import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { LoadingAnimation } from "@/components/Loading";
import { timeAgo } from "@/lib/time";
import { NotebookIcon } from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import {
  IndexAttempt,
  ListIndexingResponse,
} from "@/components/admin/connectors/types";
import { getSourceMetadata } from "@/components/source";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { submitIndexRequest } from "@/components/admin/connectors/Form";
import { useState } from "react";
import { Popup } from "@/components/admin/connectors/Popup";

const getModifiedSource = (indexAttempt: IndexAttempt) => {
  return indexAttempt.source === "web"
    ? indexAttempt.source + indexAttempt.connector_specific_config?.base_url
    : indexAttempt.source;
};

const getLatestIndexAttemptsBySource = (indexAttempts: IndexAttempt[]) => {
  const latestIndexAttemptsBySource = new Map<string, IndexAttempt>();
  indexAttempts.forEach((indexAttempt) => {
    const source = getModifiedSource(indexAttempt);
    const existingIndexAttempt = latestIndexAttemptsBySource.get(source);
    if (
      !existingIndexAttempt ||
      indexAttempt.time_updated > existingIndexAttempt.time_updated
    ) {
      latestIndexAttemptsBySource.set(source, indexAttempt);
    }
  });
  return latestIndexAttemptsBySource;
};

export default function Status() {
  const { mutate } = useSWRConfig();
  const { data, isLoading, error } = useSWR<ListIndexingResponse>(
    "/api/admin/connectors/index-attempt",
    fetcher
  );

  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // TODO: don't retrieve all index attempts, just the latest ones for each source
  const latestIndexAttemptsBySource = getLatestIndexAttemptsBySource(
    data?.index_attempts || []
  );
  const latestSuccessfulIndexAttemptsBySource = getLatestIndexAttemptsBySource(
    data?.index_attempts?.filter(
      (indexAttempt) => indexAttempt.status === "success"
    ) || []
  );

  return (
    <div className="mx-auto">
      {popup && <Popup message={popup.message} type={popup.type} />}
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <NotebookIcon size="32" />
        <h1 className="text-3xl font-bold pl-2">Indexing Status</h1>
      </div>

      {isLoading ? (
        <LoadingAnimation text="Loading" />
      ) : error ? (
        <div>Error loading indexing history</div>
      ) : (
        <BasicTable
          columns={[
            { header: "Connector", key: "connector" },
            { header: "Status", key: "status" },
            { header: "Last Indexed", key: "indexed_at" },
            { header: "Docs Indexed", key: "docs_indexed" },
            { header: "Re-Index", key: "reindex" },
          ]}
          data={Array.from(latestIndexAttemptsBySource.values()).map(
            (indexAttempt) => {
              const sourceMetadata = getSourceMetadata(indexAttempt.source);
              const successfulIndexAttempt =
                latestSuccessfulIndexAttemptsBySource.get(
                  getModifiedSource(indexAttempt)
                );

              let statusDisplay = (
                <div className="text-gray-400">In Progress...</div>
              );
              if (indexAttempt.status === "success") {
                statusDisplay = (
                  <div className="text-green-600 flex">
                    <CheckCircle className="my-auto mr-1" size="18" />
                    Success
                  </div>
                );
              } else if (indexAttempt.status === "failed") {
                statusDisplay = (
                  <div className="text-red-600 flex">
                    <XCircle className="my-auto mr-1" size="18" />
                    Error
                  </div>
                );
              }
              return {
                indexed_at:
                  timeAgo(successfulIndexAttempt?.time_updated) || "-",
                docs_indexed: successfulIndexAttempt?.docs_indexed
                  ? `${successfulIndexAttempt?.docs_indexed} documents`
                  : "-",
                connector: (
                  <a
                    className="text-blue-500 flex"
                    href={sourceMetadata.adminPageLink}
                  >
                    {sourceMetadata.icon({ size: "20" })}
                    <div className="ml-1">
                      {sourceMetadata.displayName}
                      {indexAttempt.source === "web" &&
                        indexAttempt.connector_specific_config?.base_url &&
                        ` [${indexAttempt.connector_specific_config?.base_url}]`}
                    </div>
                  </a>
                ),
                status: statusDisplay,
                reindex: (
                  <button
                    className={
                      "group relative " +
                      "py-1 px-2 border border-transparent text-sm " +
                      "font-medium rounded-md text-white bg-red-800 " +
                      "hover:bg-red-900 focus:outline-none focus:ring-2 " +
                      "focus:ring-offset-2 focus:ring-red-500 mx-auto"
                    }
                    onClick={async () => {
                      const { message, isSuccess } = await submitIndexRequest(
                        indexAttempt.source,
                        indexAttempt.connector_specific_config
                      );
                      setPopup({
                        message,
                        type: isSuccess ? "success" : "error",
                      });
                      setTimeout(() => {
                        setPopup(null);
                      }, 3000);
                      mutate("/api/admin/connectors/index-attempt");
                    }}
                  >
                    Index
                  </button>
                ),
              };
            }
          )}
        />
      )}
    </div>
  );
}
