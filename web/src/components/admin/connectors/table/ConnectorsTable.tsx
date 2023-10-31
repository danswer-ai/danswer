import { ConnectorIndexingStatus, Credential } from "@/lib/types";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { LinkBreakIcon, LinkIcon } from "@/components/icons/icons";
import { disableConnector } from "@/lib/connector";
import { AttachCredentialButtonForTable } from "@/components/admin/connectors/buttons/AttachCredentialButtonForTable";
import { DeleteColumn } from "./DeleteColumn";

interface StatusRowProps<ConnectorConfigType, ConnectorCredentialType> {
  connectorIndexingStatus: ConnectorIndexingStatus<
    ConnectorConfigType,
    ConnectorCredentialType
  >;
  hasCredentialsIssue: boolean;
  setPopup: (popupSpec: PopupSpec | null) => void;
  onUpdate: () => void;
}

export function StatusRow<ConnectorConfigType, ConnectorCredentialType>({
  connectorIndexingStatus,
  hasCredentialsIssue,
  setPopup,
  onUpdate,
}: StatusRowProps<ConnectorConfigType, ConnectorCredentialType>) {
  const [statusHovered, setStatusHovered] = useState<boolean>(false);
  const connector = connectorIndexingStatus.connector;

  let shouldDisplayDisabledToggle = !hasCredentialsIssue;
  let statusDisplay;
  switch (connectorIndexingStatus.last_status) {
    case "failed":
      statusDisplay = <div className="text-red-700">Failed</div>;
      break;
    default:
      statusDisplay = <div className="text-emerald-600 flex">Enabled!</div>;
  }
  if (connector.disabled) {
    const deletionAttempt = connectorIndexingStatus.deletion_attempt;
    if (!deletionAttempt || deletionAttempt.status === "FAILURE") {
      statusDisplay = <div className="text-red-700">Disabled</div>;
    } else {
      statusDisplay = <div className="text-red-700">Deleting...</div>;
      shouldDisplayDisabledToggle = false;
    }
  }

  return (
    <div className="flex">
      {statusDisplay}
      {shouldDisplayDisabledToggle && (
        <div
          className="cursor-pointer ml-1 my-auto relative"
          onMouseEnter={() => setStatusHovered(true)}
          onMouseLeave={() => setStatusHovered(false)}
          onClick={() => disableConnector(connector, setPopup, onUpdate)}
        >
          {statusHovered && (
            <div className="flex flex-nowrap absolute top-0 left-0 ml-8 bg-gray-700 px-3 py-2 rounded shadow-lg">
              {connector.disabled ? "Enable!" : "Disable!"}
            </div>
          )}
          {connector.disabled ? (
            <LinkIcon className="my-auto flex flex-shrink-0 text-red-700" />
          ) : (
            <LinkBreakIcon
              className={`my-auto flex flex-shrink-0 ${
                connectorIndexingStatus.last_status === "failed"
                  ? "text-red-700"
                  : "text-emerald-600"
              }`}
            />
          )}
        </div>
      )}
    </div>
  );
}

export interface ColumnSpecification<
  ConnectorConfigType,
  ConnectorCredentialType
> {
  header: string;
  key: string;
  getValue: (
    ccPairStatus: ConnectorIndexingStatus<
      ConnectorConfigType,
      ConnectorCredentialType
    >
  ) => JSX.Element | string | undefined;
}

export interface ConnectorsTableProps<
  ConnectorConfigType,
  ConnectorCredentialType
> {
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
  specialColumns?: ColumnSpecification<
    ConnectorConfigType,
    ConnectorCredentialType
  >[];
  includeName?: boolean;
}

export function ConnectorsTable<ConnectorConfigType, ConnectorCredentialType>({
  connectorIndexingStatuses,
  liveCredential,
  getCredential,
  specialColumns,
  onUpdate,
  onCredentialLink,
  includeName = false,
}: ConnectorsTableProps<ConnectorConfigType, ConnectorCredentialType>) {
  const { popup, setPopup } = usePopup();

  const connectorIncludesCredential =
    getCredential !== undefined && onCredentialLink !== undefined;

  const columns = [
    ...(includeName ? [{ header: "Name", key: "name" }] : []),
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
      {popup}
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
            status: (
              <StatusRow
                connectorIndexingStatus={connectorIndexingStatus}
                hasCredentialsIssue={
                  !hasValidCredentials && connectorIncludesCredential
                }
                setPopup={setPopup}
                onUpdate={onUpdate}
              />
            ),
            remove: (
              <DeleteColumn
                connectorIndexingStatus={connectorIndexingStatus}
                setPopup={setPopup}
                onUpdate={onUpdate}
              />
            ),
            ...credential,
            ...(specialColumns
              ? Object.fromEntries(
                  specialColumns.map(({ key, getValue }, i) => [
                    key,
                    getValue(connectorIndexingStatus),
                  ])
                )
              : {}),
            ...(includeName
              ? {
                  name: connectorIndexingStatus.name || "",
                }
              : {}),
          };
          // index: (
          //   <IndexButtonForTable
          //     onClick={async () => {
          //       const { message, isSuccess } = await submitIndexRequest(
          //         connector.source,
          //         connector.connector_specific_config
          //       );
          //       setPopup({
          //         message,
          //         type: isSuccess ? "success" : "error",
          //       });
          //       setTimeout(() => {
          //         setPopup(null);
          //       }, 4000);
          //       mutate("/api/admin/connector/index-attempt");
          //     }}
          //   />
          // ),
        })}
      />
    </>
  );
}
