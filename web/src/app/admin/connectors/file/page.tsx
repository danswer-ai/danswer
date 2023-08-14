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
import { Spinner } from "@/components/Spinner";
import { SingleUseConnectorsTable } from "@/components/admin/connectors/table/SingleUseConnectorsTable";
import { LoadingAnimation } from "@/components/Loading";

const getNameFromPath = (path: string) => {
  const pathParts = path.split("/");
  return pathParts[pathParts.length - 1];
};

const Main = () => {
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

  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    fetcher
  );

  if (!connectorIndexingStatuses && isConnectorIndexingStatusesLoading) {
    return <LoadingAnimation text="Loading" />;
  }

  const fileIndexingStatuses: ConnectorIndexingStatus<FileConfig, {}>[] =
    connectorIndexingStatuses?.filter(
      (connectorIndexingStatus) =>
        connectorIndexingStatus.connector.source === "file"
    ) ?? [];

  return (
    <div>
      {popup && <Popup message={popup.message} type={popup.type} />}
      {filesAreUploading && <Spinner />}
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">Upload Files</h2>
      <p className="text-sm mb-2">
        Specify files below, click the <b>Upload</b> button, and the contents of
        these files will be searchable via Danswer! Currently only <i>.txt</i>{" "}
        and <i>.zip</i> files (containing only <i>.txt</i> files) are supported.
      </p>
      <div className="text-sm mb-3">
        <b>NOTE:</b> if the original document is accessible via a link, you can
        add a line at the very beginning of the file that looks like:
        <div className="flex my-2">
          <div className="mx-auto font-bold">
            #DANSWER_METADATA={"{"}&quot;link&quot;: &quot;{"<LINK>"}&quot;{"}"}
          </div>
        </div>{" "}
        where <i>{"<LINK>"}</i> is the link to the file. This will enable
        Danswer to link users to the original document when they click on the
        search result. More details on this can be found in the{" "}
        <a
          href="https://docs.danswer.dev/connectors/file"
          className="text-blue-500"
        >
          documentation.
        </a>
      </div>
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

      {fileIndexingStatuses.length > 0 && (
        <div className="mt-6">
          <SingleUseConnectorsTable<FileConfig, {}>
            connectorIndexingStatuses={fileIndexingStatuses}
            specialColumns={[
              {
                header: "File Names",
                key: "file_names",
                getValue: (connector) =>
                  connector.connector_specific_config.file_locations
                    .map(getNameFromPath)
                    .join(", "),
              },
            ]}
            onUpdate={() =>
              mutate("/api/manage/admin/connector/indexing-status")
            }
          />
        </div>
      )}
    </div>
  );
};

export default function File() {
  return (
    <div className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <FileIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">File</h1>
      </div>
      <Main />
    </div>
  );
}
