import { Connector, Credential } from "@/lib/types";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { Popup } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { TrashIcon } from "@/components/icons/icons";
import { deleteConnector } from "@/lib/connector";
import { AttachCredentialButtonForTable } from "@/components/admin/connectors/buttons/AttachCredentialButtonForTable";

interface ColumnSpecification<ConnectorConfigType> {
  header: string;
  key: string;
  getValue: (connector: Connector<ConnectorConfigType>) => JSX.Element | string;
}

interface Props<ConnectorConfigType, ConnectorCredentialType> {
  connectors: Connector<ConnectorConfigType>[];
  liveCredential: Credential<ConnectorCredentialType> | null;
  getCredential?: (
    credential: Credential<ConnectorCredentialType>
  ) => JSX.Element | string;
  onDelete: () => void;
  onCredentialLink?: (connectorId: number) => void;
  specialColumns?: ColumnSpecification<ConnectorConfigType>[];
}

export function ConnectorsTable<ConnectorConfigType, ConnectorCredentialType>({
  connectors,
  liveCredential,
  getCredential,
  specialColumns,
  onDelete,
  onCredentialLink,
}: Props<ConnectorConfigType, ConnectorCredentialType>) {
  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const connectorIncludesCredential = getCredential && onCredentialLink;

  const columns = [
    ...(specialColumns ?? []),
    {
      header: "Status",
      key: "status",
    },
    {
      header: "Remove",
      key: "remove",
    },
  ];
  if (connectorIncludesCredential) {
    columns.push({
      header: "Credential",
      key: "credential",
    });
  }

  return (
    <>
      {popup && <Popup message={popup.message} type={popup.type} />}
      <BasicTable
        columns={columns}
        data={connectors.map((connector) => {
          const hasValidCredentials =
            liveCredential &&
            connector.credential_ids.includes(liveCredential.id);
          const credential = connectorIncludesCredential
            ? {
                credential: hasValidCredentials ? (
                  <p className="max-w-sm truncate">
                    {getCredential(liveCredential)}
                  </p>
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
            status: connector.disabled ? (
              <div className="text-red-700">Disabled</div>
            ) : hasValidCredentials || !connectorIncludesCredential ? (
              <div className="text-emerald-600">Running!</div>
            ) : (
              <div className="text-red-700">Missing Credentials</div>
            ),
            remove: (
              <div
                className="cursor-pointer mx-auto"
                onClick={() => {
                  deleteConnector(connector.id).then(() => {
                    setPopup({
                      message: "Successfully deleted connector",
                      type: "success",
                    });
                    setTimeout(() => {
                      setPopup(null);
                    }, 3000);
                    onDelete();
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
          //       }, 3000);
          //       mutate("/api/admin/connector/index-attempt");
          //     }}
          //   />
          // ),
        })}
      />
    </>
  );
}
