import { ConnectorIndexingStatus, Credential } from "@/lib/types";
import { LinkBreakIcon, LinkIcon } from "@/components/icons/icons";
import { disableConnector } from "@/lib/connector";
import { AttachCredentialButtonForTable } from "@/components/admin/connectors/buttons/AttachCredentialButtonForTable";
import { DeleteColumn } from "./DeleteColumn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { CustomTooltip } from "@/components/CustomTooltip";
import { Badge } from "@/components/ui/badge";
import { Check, XCircle } from "lucide-react";

interface StatusRowProps<ConnectorConfigType, ConnectorCredentialType> {
  connectorIndexingStatus: ConnectorIndexingStatus<
    ConnectorConfigType,
    ConnectorCredentialType
  >;
  hasCredentialsIssue: boolean;
  onUpdate: () => void;
}

export function StatusRow<ConnectorConfigType, ConnectorCredentialType>({
  connectorIndexingStatus,
  hasCredentialsIssue,
  onUpdate,
}: StatusRowProps<ConnectorConfigType, ConnectorCredentialType>) {
  const connector = connectorIndexingStatus.connector;

  let shouldDisplayDisabledToggle = !hasCredentialsIssue;
  let statusDisplay;
  let statusClass = "";
  let badgeVariant:
    | "default"
    | "secondary"
    | "warning"
    | "destructive"
    | "outline"
    | "success" = "default";

  switch (connectorIndexingStatus.last_status) {
    case "failed":
      statusDisplay = <div>Failed</div>;
      statusClass = "";
      badgeVariant = "destructive";
      break;
    default:
      statusDisplay = <div className="flex">Enabled!</div>;
      badgeVariant = "success";
  }

  if (connector.disabled) {
    const deletionAttempt = connectorIndexingStatus.deletion_attempt;
    if (!deletionAttempt || deletionAttempt.status === "FAILURE") {
      statusDisplay = <div className="text-black">Paused</div>;
      statusClass = "text-black";
      badgeVariant = "secondary";
    } else {
      statusDisplay = <div>Deleting...</div>;
      shouldDisplayDisabledToggle = false;
      badgeVariant = "destructive";
    }
  }

  return (
    <CustomTooltip
      trigger={
        <Badge
          onClick={() => disableConnector(connector, onUpdate)}
          className="flex items-center gap-1"
          variant={badgeVariant}
        >
          {statusDisplay}
          {connector.disabled ? (
            <LinkIcon
              className="my-auto flex flex-shrink-0 text-black" // Black color for disabled state
              size={14}
            />
          ) : (
            <LinkBreakIcon
              className={`my-auto flex flex-shrink-0 ${statusClass}`}
              size={14}
            />
          )}
        </Badge>
      }
    >
      {connector.disabled ? "Enable!" : "Pause!"}
    </CustomTooltip>
  );
}

export interface ColumnSpecification<
  ConnectorConfigType,
  ConnectorCredentialType,
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
  ConnectorCredentialType,
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
  const connectorIncludesCredential =
    getCredential !== undefined && onCredentialLink !== undefined;

  const columns = [
    ...(includeName ? [{ header: "Name", key: "name" }] : []),
    ...(specialColumns ?? []),
    {
      header: "Status",
      key: "status",
    },
    {
      header: "Is Public",
      key: "is_public",
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
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {includeName && <TableHead>Name</TableHead>}
              {specialColumns?.map(({ header }) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
              <TableHead>Status</TableHead>
              <TableHead>Is Public</TableHead>
              {connectorIncludesCredential && <TableHead>Credential</TableHead>}
              <TableHead>Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connectorIndexingStatuses.map((connectorIndexingStatus) => {
              const connector = connectorIndexingStatus.connector;
              // const credential = connectorIndexingStatus.credential;
              const hasValidCredentials =
                liveCredential &&
                connector.credential_ids.includes(liveCredential.id);
              const credentialDisplay = connectorIncludesCredential ? (
                hasValidCredentials ? (
                  <div className="max-w-sm truncate">
                    {getCredential(liveCredential)}
                  </div>
                ) : liveCredential ? (
                  <AttachCredentialButtonForTable
                    onClick={() => onCredentialLink(connector.id)}
                  />
                ) : (
                  <p className="text-red-700">N/A</p>
                )
              ) : (
                "-"
              );
              return (
                <TableRow key={connectorIndexingStatus.cc_pair_id}>
                  {includeName && (
                    <TableCell className="whitespace-normal break-all">
                      <p className="text font-medium">
                        {connectorIndexingStatus.name}
                      </p>
                    </TableCell>
                  )}
                  {specialColumns?.map(({ key, getValue }) => (
                    <TableCell key={key}>
                      {getValue(connectorIndexingStatus)}
                    </TableCell>
                  ))}
                  <TableCell>
                    <StatusRow
                      connectorIndexingStatus={connectorIndexingStatus}
                      hasCredentialsIssue={
                        !hasValidCredentials && connectorIncludesCredential
                      }
                      onUpdate={onUpdate}
                    />
                  </TableCell>
                  <TableCell>
                    {connectorIndexingStatus.public_doc ? (
                      <Check className="my-auto text-success" size="18" />
                    ) : (
                      <XCircle className="my-auto text-error" />
                    )}
                  </TableCell>
                  {connectorIncludesCredential && (
                    <TableCell>{credentialDisplay}</TableCell>
                  )}
                  <TableCell>
                    <DeleteColumn
                      connectorIndexingStatus={connectorIndexingStatus}
                      onUpdate={onUpdate}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
