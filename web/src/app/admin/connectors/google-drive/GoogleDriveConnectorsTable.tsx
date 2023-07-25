import { Button } from "@/components/Button";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { StatusRow } from "@/components/admin/connectors/table/ConnectorsTable";
import { PencilIcon } from "@/components/icons/icons";
import { deleteConnector } from "@/lib/connector";
import { GoogleDriveConfig, ConnectorIndexingStatus } from "@/lib/types";
import { useSWRConfig } from "swr";
import { useState } from "react";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { TextArrayFieldBuilder } from "@/components/admin/connectors/Field";
import * as Yup from "yup";
import { linkCredential } from "@/lib/credential";
import { ConnectorEditPopup } from "./ConnectorEditPopup";

interface EditableColumnProps {
  connectorIndexingStatus: ConnectorIndexingStatus<GoogleDriveConfig>;
}

const EditableColumn = ({ connectorIndexingStatus }: EditableColumnProps) => {
  const { mutate } = useSWRConfig();
  const [isEditing, setIsEditing] = useState<boolean>(false);

  return (
    <>
      {isEditing && (
        <ConnectorEditPopup
          existingConnector={connectorIndexingStatus.connector}
          onSubmit={() => {
            setIsEditing(false);
            mutate("/api/manage/admin/connector/indexing-status");
          }}
        />
      )}
      <div className="flex w-4">
        <div
          onClick={() => {
            setIsEditing(true);
          }}
          className="cursor-pointer"
        >
          <div className="mr-2">
            <PencilIcon size={20} />
          </div>
        </div>
      </div>
    </>
  );
};

interface TableProps {
  googleDriveConnectorIndexingStatuses: ConnectorIndexingStatus<GoogleDriveConfig>[];
  setPopup: (popupSpec: PopupSpec | null) => void;
}

export const GoogleDriveConnectorsTable = ({
  googleDriveConnectorIndexingStatuses,
  setPopup,
}: TableProps) => {
  const { mutate } = useSWRConfig();

  // Sorting to maintain a consistent ordering
  const sortedGoogleDriveConnectorIndexingStatuses = [
    ...googleDriveConnectorIndexingStatuses,
  ];
  sortedGoogleDriveConnectorIndexingStatuses.sort(
    (a, b) => a.connector.id - b.connector.id
  );

  return (
    <BasicTable
      columns={[
        {
          header: "",
          key: "edit",
          width: 4,
        },
        {
          header: "Folder Paths",
          key: "folder_paths",
        },
        {
          header: "Status",
          key: "status",
        },
        {
          header: "Delete",
          key: "delete",
        },
      ]}
      data={sortedGoogleDriveConnectorIndexingStatuses.map(
        (connectorIndexingStatus) => ({
          edit: (
            <EditableColumn connectorIndexingStatus={connectorIndexingStatus} />
          ),
          folder_paths:
            (
              connectorIndexingStatus.connector.connector_specific_config
                .folder_paths || []
            ).length > 0 ? (
              <div key={connectorIndexingStatus.connector.id}>
                {(
                  connectorIndexingStatus.connector.connector_specific_config
                    .folder_paths || []
                ).map((path) => (
                  <div>
                    <i> - {path}</i>
                  </div>
                ))}
              </div>
            ) : (
              <i>All Folders</i>
            ),
          status: (
            <StatusRow
              connectorIndexingStatus={connectorIndexingStatus}
              hasCredentialsIssue={
                connectorIndexingStatus.connector.credential_ids.length === 0
              }
              setPopup={setPopup}
              onUpdate={() => {
                mutate("/api/manage/admin/connector/indexing-status");
              }}
            />
          ),
          delete: (
            <Button
              onClick={() => {
                deleteConnector(connectorIndexingStatus.connector.id).then(
                  (errorMsg) => {
                    if (errorMsg) {
                      setPopup({
                        message: `Unable to delete existing connector - ${errorMsg}`,
                        type: "error",
                      });
                    } else {
                      setPopup({
                        message: "Successfully deleted connector!",
                        type: "success",
                      });
                      mutate("/api/manage/admin/connector/indexing-status");
                    }
                  }
                );
              }}
            >
              Delete Connector
            </Button>
          ),
        })
      )}
    />
  );
};
