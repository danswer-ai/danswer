import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { StatusRow } from "@/components/admin/connectors/table/ConnectorsTable";
import { deleteConnector } from "@/lib/connector";
import {
  GmailConfig,
  ConnectorIndexingStatus,
  GmailCredentialJson,
} from "@/lib/types";
import { useSWRConfig } from "swr";
import { DeleteColumn } from "@/components/admin/connectors/table/DeleteColumn";
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@tremor/react";
import { useToast } from "@/hooks/use-toast";

interface TableProps {
  gmailConnectorIndexingStatuses: ConnectorIndexingStatus<
    GmailConfig,
    GmailCredentialJson
  >[];
}

export const GmailConnectorsTable = ({
  gmailConnectorIndexingStatuses: gmailConnectorIndexingStatuses,
}: TableProps) => {
  const { mutate } = useSWRConfig();
  const { toast } = useToast();

  // Sorting to maintain a consistent ordering
  const sortedGmailConnectorIndexingStatuses = [
    ...gmailConnectorIndexingStatuses,
  ];
  sortedGmailConnectorIndexingStatuses.sort(
    (a, b) => a.connector.id - b.connector.id
  );

  return (
    <div>
      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Delete</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedGmailConnectorIndexingStatuses.map(
            (connectorIndexingStatus) => {
              return (
                <TableRow key={connectorIndexingStatus.cc_pair_id}>
                  <TableCell>
                    <StatusRow
                      connectorIndexingStatus={connectorIndexingStatus}
                      hasCredentialsIssue={
                        connectorIndexingStatus.connector.credential_ids
                          .length === 0
                      }
                      onUpdate={() => {
                        mutate("/api/manage/admin/connector/indexing-status");
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <DeleteColumn
                      connectorIndexingStatus={connectorIndexingStatus}
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
};
