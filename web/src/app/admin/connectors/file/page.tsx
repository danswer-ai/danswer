"use client";

import useSWR, { useSWRConfig } from "swr";

import { FileIcon } from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { ConnectorIndexingStatus, FileConfig } from "@/lib/types";
import { linkCredential } from "@/lib/credential";
import { FileUpload } from "./FileUpload";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Popup, PopupSpec } from "@/components/admin/connectors/Popup";
import { createConnector, runConnector } from "@/lib/connector";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { Spinner } from "@/components/Spinner";

export default function File() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filesAreUploading, setFilesAreUploading] = useState<boolean>(false);
  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const setPopupWithExpiration = (popupSpec: PopupSpec | null) => {
    setPopup(popupSpec);
    setTimeout(() => {
      setPopup(null);
    }, 4000);
  };

  const { mutate } = useSWRConfig();

  const { data: connectorIndexingStatuses } = useSWR<
    ConnectorIndexingStatus<any>[]
  >("/api/manage/admin/connector/indexing-status", fetcher);

  const fileIndexingStatuses: ConnectorIndexingStatus<FileConfig>[] =
    connectorIndexingStatuses?.filter(
      (connectorIndexingStatus) =>
        connectorIndexingStatus.connector.source === "file"
    ) ?? [];

  const inProgressFileIndexingStatuses =
    fileIndexingStatuses.filter(
      (connectorIndexingStatus) =>
        connectorIndexingStatus.last_status === "in_progress" ||
        connectorIndexingStatus.last_status === "not_started"
    ) ?? [];

  const successfulFileIndexingStatuses = fileIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.last_status === "success"
  );

  const failedFileIndexingStatuses = fileIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.last_status === "failed"
  );

  return (
    <div className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <FileIcon size="32" />
        <h1 className="text-3xl font-bold pl-2">File</h1>
      </div>
      {popup && <Popup message={popup.message} type={popup.type} />}
      {filesAreUploading && <Spinner />}
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">Upload Files</h2>
      <p className="text-sm mb-2">
        Specify files below, click the <b>Upload</b> button, and the contents of
        these files will be searchable via Danswer!
      </p>
      <div className="flex">
        <div className="mx-auto max-w-3xl w-full">
          <FileUpload
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
          />

          <Button
            className="mt-4 w-48"
            fullWidth
            disabled={selectedFiles.length === 0}
            onClick={async () => {
              const uploadCreateAndTriggerConnector = async () => {
                const formData = new FormData();

                selectedFiles.forEach((file) => {
                  formData.append("files", file);
                });

                const response = await fetch(
                  "/api/manage/admin/connector/file/upload",
                  { method: "POST", body: formData }
                );
                const responseJson = await response.json();
                if (!response.ok) {
                  setPopupWithExpiration({
                    message: `Unable to upload files - ${responseJson.detail}`,
                    type: "error",
                  });
                  return;
                }

                const filePaths = responseJson.file_paths as string[];
                const [connectorErrorMsg, connector] =
                  await createConnector<FileConfig>({
                    name: "FileConnector-" + Date.now(),
                    source: "file",
                    input_type: "load_state",
                    connector_specific_config: {
                      file_locations: filePaths,
                    },
                    refresh_freq: null,
                    disabled: false,
                  });
                if (connectorErrorMsg || !connector) {
                  setPopupWithExpiration({
                    message: `Unable to create connector - ${connectorErrorMsg}`,
                    type: "error",
                  });
                  return;
                }

                const credentialResponse = await linkCredential(
                  connector.id,
                  0
                );
                if (credentialResponse.detail) {
                  setPopupWithExpiration({
                    message: `Unable to link connector to credential - ${credentialResponse.detail}`,
                    type: "error",
                  });
                  return;
                }

                const runConnectorErrorMsg = await runConnector(connector.id, [
                  0,
                ]);
                if (runConnectorErrorMsg) {
                  setPopupWithExpiration({
                    message: `Unable to run connector - ${runConnectorErrorMsg}`,
                    type: "error",
                  });
                  return;
                }

                mutate("/api/manage/admin/connector/indexing-status");
                setSelectedFiles([]);
                setPopupWithExpiration({
                  type: "success",
                  message: "Successfully uploaded files!",
                });
              };

              setFilesAreUploading(true);
              try {
                await uploadCreateAndTriggerConnector();
              } catch (e) {
                console.log("Failed to index filels: ", e);
              }
              setFilesAreUploading(false);
            }}
          >
            Upload!
          </Button>
        </div>
      </div>

      {inProgressFileIndexingStatuses.length > 0 && (
        <>
          <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
            In Progress File Indexing
          </h2>
          <BasicTable
            columns={[
              { header: "File names", key: "fileNames" },
              { header: "Status", key: "status" },
            ]}
            data={inProgressFileIndexingStatuses.map(
              (connectorIndexingStatus) => {
                return {
                  fileNames:
                    connectorIndexingStatus.connector.connector_specific_config.file_locations
                      .map((path) => path.split("__").splice(1).join("__"))
                      .join(", "),
                  status: "In Progress",
                };
              }
            )}
          />
        </>
      )}

      {successfulFileIndexingStatuses.length > 0 && (
        <>
          <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
            Successful File Indexing
          </h2>
          <BasicTable
            columns={[
              { header: "File names", key: "fileNames" },
              { header: "Status", key: "status" },
            ]}
            data={successfulFileIndexingStatuses.map(
              (connectorIndexingStatus) => {
                return {
                  fileNames:
                    connectorIndexingStatus.connector.connector_specific_config.file_locations
                      .map((path) => path.split("__").splice(1).join("__"))
                      .join(", "),
                  status: (
                    <div className="text-emerald-600 flex">
                      <CheckCircle className="my-auto mr-1" size="18" /> Success
                    </div>
                  ),
                };
              }
            )}
          />
        </>
      )}

      {failedFileIndexingStatuses.length > 0 && (
        <>
          <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
            Failed File Indexing
          </h2>
          <p className="text-sm mb-3">
            The following files failed to be indexed. Please contact an
            administrator to resolve this issue.
          </p>
          <BasicTable
            columns={[
              { header: "File names", key: "fileNames" },
              { header: "Status", key: "status" },
            ]}
            data={failedFileIndexingStatuses.map((connectorIndexingStatus) => {
              return {
                fileNames:
                  connectorIndexingStatus.connector.connector_specific_config.file_locations
                    .map((path) => path.split("__").splice(1).join("__"))
                    .join(", "),
                status: (
                  <div className="text-red-600 flex">
                    <XCircle className="my-auto mr-1" size="18" /> Failed
                  </div>
                ),
              };
            })}
          />
        </>
      )}
    </div>
  );
}
