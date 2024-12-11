import { SourceIcon } from "@/components/SourceIcon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTimeElapsedString } from "@/lib/dateUtils";
import { getSourceDisplayName } from "@/lib/sources";
import { ConnectorBackgroundIndexingStatus, ValidSources } from "@/lib/types";
import React from "react";

function SummaryRow({ status }: { status: ConnectorBackgroundIndexingStatus }) {
  let elapsedString = "Waiting to start...";
  if (status.started) {
    const parsedDate = new Date(status.started);
    elapsedString = getTimeElapsedString(parsedDate);
  }

  const source = status.source as ValidSources;

  return (
    <TableRow className="border-border bg-white py-4 rounded-sm !border cursor-pointer">
      <TableCell>
        <div className="text-xl font-semibold">{status.name}</div>
      </TableCell>
      <TableCell>
        <div className="text-xl flex items-center truncate ellipsis gap-x-2 font-semibold">
          <SourceIcon iconSize={20} sourceType={source} />
          {getSourceDisplayName(source)}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-xl font-semibold">{status.cc_pair_id}</div>
      </TableCell>
      <TableCell>
        <div className="text-xl font-semibold">{status.search_settings_id}</div>
      </TableCell>
      <TableCell>
        <div className="text-xl font-semibold">{status.index_attempt_id}</div>
      </TableCell>

      <TableCell>
        <div className="text-xl font-semibold">{status.progress}</div>
      </TableCell>

      <TableCell>
        <div className="text-xl font-semibold">{elapsedString}</div>
      </TableCell>

      <TableCell />
    </TableRow>
  );
}

export function BackgroundIndexingStatusTable({
  indexingStatuses,
}: {
  indexingStatuses: ConnectorBackgroundIndexingStatus[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Connector</TableHead>
          <TableHead>CC Pair</TableHead>
          <TableHead>Search Settings</TableHead>
          <TableHead>Attempt ID</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Elapsed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {indexingStatuses.map((status, index) => (
          <React.Fragment key={index}>
            <SummaryRow status={status} />
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  );
}
