import {
  Connector,
  ConnectorIndexingStatus,
  Credential,
  DeletionAttemptSnapshot,
  ValidStatuses,
} from "@/lib/types";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { Popup } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { TrashIcon } from "@/components/icons/icons";
import { updateConnector } from "@/lib/connector";
import { AttachCredentialButtonForTable } from "@/components/admin/connectors/buttons/AttachCredentialButtonForTable";
import { scheduleDeletionJobForConnector } from "@/lib/documentDeletion";

const SingleUseConnectorStatus = ({
  indexingStatus,
  deletionAttempt,
}: {
  indexingStatus: ValidStatuses | null;
  deletionAttempt: DeletionAttemptSnapshot | null;
}) => {
  if (
    deletionAttempt &&
    (deletionAttempt.status === "in_progress" ||
      deletionAttempt.status === "not_started")
  ) {
    return <div className="text-red-500">Deleting...</div>;
  }

  if (!indexingStatus || indexingStatus === "not_started") {
    return <div className="text-gray-600">Not Started</div>;
  }

  if (indexingStatus === "in_progress") {
    return <div className="text-gray-400">In Progress</div>;
  }

  if (indexingStatus === "success") {
    return <div className="text-emerald-600">Success!</div>;
  }

  return <div className="text-red-700">Failed</div>;
};

interface ColumnSpecification<ConnectorConfigType> {
  header: string;
  key: string;
  getValue: (connector: Connector<ConnectorConfigType>) => JSX.Element | string;
}

interface ConnectorsTableProps<ConnectorConfigType, ConnectorCredentialType> {
  connectorIndexingStatuses: ConnectorIndexingStatus<
    ConnectorConfigType,
    ConnectorCredentialType
  >[];
  liveCredential?: Credential<ConnectorCredentialType> | null;
  getCredential?: (
    credential: Credential<ConnectorCredentialType>
  ) => JSX.Element | string;
  onUpdate: () => void;
  onCredentialLink?: (connectorId: number) => void;
  specialColumns?: ColumnSpecification<ConnectorConfigType>[];
}

export function SingleUseConnectorsTable<
  ConnectorConfigType,
  ConnectorCredentialType
>({
  connectorIndexingStatuses,
  liveCredential,
  getCredential,
  specialColumns,
  onUpdate,
  onCredentialLink,
}: ConnectorsTableProps<ConnectorConfigType, ConnectorCredentialType>) {
  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const connectorIncludesCredential =
    getCredential !== undefined && onCredentialLink !== undefined;

  const columns = [
    {
      header: "Name",
      key: "name",
    },
    ...(specialColumns ?? []),
    {
      header: "Status",
      key: "status",
    },
  ];
  if (connectorIncludesCredential) {
    columns.push({
      header: "Credential",
      key: "credential",
    });
  }
  columns.push({
    header: "Remove",
    key: "remove",
  });

  return (
    <>
      {popup && <Popup message={popup.message} type={popup.type} />}
      <BasicTable
        columns={columns}
        data={connectorIndexingStatuses.map((connectorIndexingStatus) => {
          const connector = connectorIndexingStatus.connector;
          // const credential = connectorIndexingStatus.credential;
          const hasValidCredentials =
            liveCredential &&
            connector.credential_ids.includes(liveCredential.id);
          const credential = connectorIncludesCredential
            ? {
                credential: hasValidCredentials ? (
                  <div className="max-w-sm truncate">
                    {getCredential(liveCredential)}
                  </div>
                ) : liveCredential ? (
                  <AttachCredentialButtonForTable
                    onClick={() => onCredentialLink(connector.id)}
                  />
                ) : (
                  <p className="text-red-700">N/A</p>
                ),
              }
            : { credential: "" };
          return {
            name: connectorIndexingStatus.name || "",
            status: (
              <SingleUseConnectorStatus
                indexingStatus={connectorIndexingStatus.last_status}
                deletionAttempt={connectorIndexingStatus.deletion_attempt}
              />
            ),
            remove: (
              <div
                className="cursor-pointer mx-auto flex"
                onClick={async () => {
                  // for one-time, just disable the connector at deletion time
                  // this is required before deletion can happen
                  await updateConnector({
                    ...connector,
                    disabled: !connector.disabled,
                  });

                  const deletionScheduleError =
                    await scheduleDeletionJobForConnector(
                      connector.id,
                      connectorIndexingStatus.credential.id
                    );
                  if (deletionScheduleError) {
                    setPopup({
                      message:
                        "Failed to schedule deletion of connector - " +
                        deletionScheduleError,
                      type: "error",
                    });
                  } else {
                    setPopup({
                      message: "Scheduled deletion of connector!",
                      type: "success",
                    });
                  }
                  setTimeout(() => {
                    setPopup(null);
                  }, 4000);
                  onUpdate();
                }}
              >
                <TrashIcon />
              </div>
            ),
            ...credential,
            ...(specialColumns
              ? Object.fromEntries(
                  specialColumns.map(({ key, getValue }, i) => [
                    key,
                    getValue(connector),
                  ])
                )
              : {}),
          };
        })}
      />
    </>
  );
}
