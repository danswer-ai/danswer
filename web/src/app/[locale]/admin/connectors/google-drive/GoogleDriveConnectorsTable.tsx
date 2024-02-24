import { Button } from "@/components/Button";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { StatusRow } from "@/components/admin/connectors/table/ConnectorsTable";
import { EditIcon } from "@/components/icons/icons";
import { deleteConnector } from "@/lib/connector";
import {
  GoogleDriveConfig,
  ConnectorIndexingStatus,
  GoogleDriveCredentialJson,
} from "@/lib/types";
import { useSWRConfig } from "swr";
import { useState } from "react";
import { ConnectorEditPopup } from "./ConnectorEditPopup";
import { DeleteColumn } from "@/components/admin/connectors/table/DeleteColumn";
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@tremor/react";

interface EditableColumnProps {
  connectorIndexingStatus: ConnectorIndexingStatus<
    GoogleDriveConfig,
    GoogleDriveCredentialJson
  >;
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
            <EditIcon size={16} />
          </div>
        </div>
      </div>
    </>
  );
};

interface TableProps {
  googleDriveConnectorIndexingStatuses: ConnectorIndexingStatus<
    GoogleDriveConfig,
    GoogleDriveCredentialJson
  >[];
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
    <div>
      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Edit</TableHeaderCell>
            <TableHeaderCell>Folder Paths</TableHeaderCell>
            <TableHeaderCell>Include Shared</TableHeaderCell>
            <TableHeaderCell>Follow Shortcuts</TableHeaderCell>
            <TableHeaderCell>Only Org Public</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Delete</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedGoogleDriveConnectorIndexingStatuses.map(
            (connectorIndexingStatus) => {
              return (
                <TableRow key={connectorIndexingStatus.cc_pair_id}>
                  <TableCell>
                    <EditableColumn
                      connectorIndexingStatus={connectorIndexingStatus}
                    />
                  </TableCell>
                  <TableCell>
                    {(
                      connectorIndexingStatus.connector
                        .connector_specific_config.folder_paths || []
                    ).length > 0 ? (
                      <div key={connectorIndexingStatus.connector.id}>
                        {(
                          connectorIndexingStatus.connector
                            .connector_specific_config.folder_paths || []
                        ).map((path) => (
                          <div key={path}>
                            <i> - {path}</i>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <i>All Folders</i>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      {connectorIndexingStatus.connector
                        .connector_specific_config.include_shared ? (
                        <i>Yes</i>
                      ) : (
                        <i>No</i>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      {connectorIndexingStatus.connector
                        .connector_specific_config.follow_shortcuts ? (
                        <i>Yes</i>
                      ) : (
                        <i>No</i>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      {connectorIndexingStatus.connector
                        .connector_specific_config.only_org_public ? (
                        <i>Yes</i>
                      ) : (
                        <i>No</i>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusRow
                      connectorIndexingStatus={connectorIndexingStatus}
                      hasCredentialsIssue={
                        connectorIndexingStatus.connector.credential_ids
                          .length === 0
                      }
                      setPopup={setPopup}
                      onUpdate={() => {
                        mutate("/api/manage/admin/connector/indexing-status");
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <DeleteColumn
                      connectorIndexingStatus={connectorIndexingStatus}
                      setPopup={setPopup}
                      onUpdate={() =>
                        mutate("/api/manage/admin/connector/indexing-status")
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            }
          )}
        </TableBody>
      </Table>
    </div>
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
          header: "Include Shared",
          key: "include_shared",
        },
        {
          header: "Follow Shortcuts",
          key: "follow_shortcuts",
        },
        {
          header: "Only Org Public",
          key: "only_org_public",
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
                  <div key={path}>
                    <i> - {path}</i>
                  </div>
                ))}
              </div>
            ) : (
              <i>All Folders</i>
            ),
          include_shared: (
            <div>
              {connectorIndexingStatus.connector.connector_specific_config
                .include_shared ? (
                <i>Yes</i>
              ) : (
                <i>No</i>
              )}
            </div>
          ),
          follow_shortcuts: (
            <div>
              {connectorIndexingStatus.connector.connector_specific_config
                .follow_shortcuts ? (
                <i>Yes</i>
              ) : (
                <i>No</i>
              )}
            </div>
          ),
          only_org_public: (
            <div>
              {connectorIndexingStatus.connector.connector_specific_config
                .only_org_public ? (
                <i>Yes</i>
              ) : (
                <i>No</i>
              )}
            </div>
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
            <DeleteColumn
              connectorIndexingStatus={connectorIndexingStatus}
              setPopup={setPopup}
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
            />
          ),
        })
      )}
    />
  );
};
