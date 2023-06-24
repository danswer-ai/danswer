import { Connector, ConnectorIndexingStatus, Credential } from "@/lib/types";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { Popup, PopupSpec } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { LinkBreakIcon, LinkIcon, TrashIcon } from "@/components/icons/icons";
import { deleteConnector, updateConnector } from "@/lib/connector";
import { AttachCredentialButtonForTable } from "@/components/admin/connectors/buttons/AttachCredentialButtonForTable";

interface StatusRowProps<ConnectorConfigType> {
  connectorIndexingStatus: ConnectorIndexingStatus<ConnectorConfigType>;
  hasCredentialsIssue: boolean;
  setPopup: (popupSpec: PopupSpec | null) => void;
  onUpdate: () => void;
}

export function StatusRow<ConnectorConfigType>({
  connectorIndexingStatus,
  hasCredentialsIssue,
  setPopup,
  onUpdate,
}: StatusRowProps<ConnectorConfigType>) {
  const [statusHovered, setStatusHovered] = useState<boolean>(false);
  const connector = connectorIndexingStatus.connector;

  let statusDisplay;
  switch (connectorIndexingStatus.last_status) {
    case "failed":
      statusDisplay = <div className="text-red-700">Failed</div>;
      break;
    default:
      statusDisplay = <div className="text-emerald-600 flex">Enabled!</div>;
  }
  if (connector.disabled) {
    statusDisplay = <div className="text-red-700">Disabled</div>;
  }

  return (
    <div className="flex">
      {statusDisplay}
      {!hasCredentialsIssue && (
        <div
          className="cursor-pointer ml-1 my-auto relative"
          onMouseEnter={() => setStatusHovered(true)}
          onMouseLeave={() => setStatusHovered(false)}
          onClick={() => {
            updateConnector({
              ...connector,
              disabled: !connector.disabled,
            }).then(() => {
              setPopup({
                message: connector.disabled
                  ? "Enabled connector!"
                  : "Disabled connector!",
                type: "success",
              });
              setTimeout(() => {
                setPopup(null);
              }, 4000);
              onUpdate();
            });
          }}
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

interface ColumnSpecification<ConnectorConfigType> {
  header: string;
  key: string;
  getValue: (connector: Connector<ConnectorConfigType>) => JSX.Element | string;
}

interface ConnectorsTableProps<ConnectorConfigType, ConnectorCredentialType> {
  connectorIndexingStatuses: ConnectorIndexingStatus<ConnectorConfigType>[];
  liveCredential?: Credential<ConnectorCredentialType> | null;
  getCredential?: (
    credential: Credential<ConnectorCredentialType>
  ) => JSX.Element | string;
  onUpdate: () => void;
  onCredentialLink?: (connectorId: number) => void;
  specialColumns?: ColumnSpecification<ConnectorConfigType>[];
}

export function ConnectorsTable<ConnectorConfigType, ConnectorCredentialType>({
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
              <div
                className="cursor-pointer mx-auto"
                onClick={() => {
                  deleteConnector(connector.id).then((errorMsg) => {
                    if (errorMsg) {
                      setPopup({
                        message: `Unable to delete existing connector - ${errorMsg}`,
                        type: "error",
                      });
                    } else {
                      setPopup({
                        message: "Successfully deleted connector",
                        type: "success",
                      });
                    }
                    setTimeout(() => {
                      setPopup(null);
                    }, 4000);
                    onUpdate();
                  });
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
