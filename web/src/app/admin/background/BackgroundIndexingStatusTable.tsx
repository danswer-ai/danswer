import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Table,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableHeader,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IndexAttemptStatus } from "@/components/Status";
import { timeAgo } from "@/lib/time";
import {
  ConnectorBackgroundIndexingStatus,
  ConnectorIndexingStatus,
  ConnectorSummary,
  GroupedConnectorSummaries,
  ValidSources,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import {
  FiChevronDown,
  FiChevronRight,
  FiSettings,
  FiLock,
  FiUnlock,
  FiRefreshCw,
  FiPauseCircle,
} from "react-icons/fi";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SourceIcon } from "@/components/SourceIcon";
import { getSourceDisplayName } from "@/lib/sources";
import { CustomTooltip } from "@/components/tooltip/CustomTooltip";
import { Warning } from "@phosphor-icons/react";
import Cookies from "js-cookie";
import { TOGGLED_CONNECTORS_COOKIE_NAME } from "@/lib/constants";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import { getTimeElapsedString } from "@/lib/dateUtils";

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

// export function BackgroundIndexingStatusTable({
//   indexingStatuses,
// }: {
//   indexingStatuses: ConnectorBackgroundIndexingStatus[];
// }) {

//   return (
//     <Table>
//       <TableHeader>
//       </TableHeader>
//       <TableBody>
//       {/* <TableRow className="border border-border">
//                         <TableHead>Name</TableHead>
//                         <TableHead>CC Pair</TableHead>
//                         <TableHead>Search Settings</TableHead>
//                         <TableHead>Progress</TableHead>
//                         <TableHead>Elapsed</TableHead>
//                       </TableRow> */}
//       indexingStatuses.map((status, index) => ()
//               return (
//                 <React.Fragment key={ind}>
//                   <br className="mt-4" />

//                       {indexingStatuses.map((status) => (
//                         <SummaryRow
//                     source={source}
//                     summary={groupSummaries[source]}
//                     isOpen={connectorsToggled[source] || false}
//                     onToggle={() => toggleSource(source)}
//                   />
//                   </React.Fragment>
//                       )
//       }
//       </TableBody>
//     </Table>
//   );
// }

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
