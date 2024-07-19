import React, { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@tremor/react";
import { CCPairStatus, IndexAttemptStatus } from "@/components/Status";
import { PageSelector } from "@/components/PageSelector";
import { timeAgo } from "@/lib/time";
import {
  ConnectorIndexingStatus,
  ConnectorSummary,
  GroupedConnectorSummaries,
  ValidSources,
} from "@/lib/types";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { getDocsProcessedPerMinute } from "@/lib/indexAttempt";
import { useRouter } from "next/navigation";
import { isCurrentlyDeleting } from "@/lib/documentDeletion";
import {
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiEdit2,
  FiSettings,
  FiXCircle,
} from "react-icons/fi";
import { Tooltip } from "@/components/tooltip/Tooltip";
import { SourceIcon } from "@/components/SourceIcon";
import { getSourceDisplayName, listSourceMetadata } from "@/lib/sources";
import { CustomTooltip } from "@/components/tooltip/CustomTooltip";
import { update } from "lodash";
import { Warning } from "@phosphor-icons/react";

const NUM_IN_PAGE = 20;

function SummaryRow({
  source,
  summary,
  isOpen,
  onToggle,
}: {
  source: ValidSources;
  summary: ConnectorSummary;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const activePercentage = (summary.active / summary.count) * 100;
  const publicPercentage = (summary.public / summary.count) * 100;

  return (
    <TableRow className="overflow-visible bg-white cursor-pointer">
      <TableCell className="py-4 w-[23%]">
        <div className="text-xl flex items-center truncate ellipsis gap-x-2 font-semibold">
          <button className="cursor-pointer" onClick={onToggle}>
            {isOpen ? (
              <FiChevronDown size={20} />
            ) : (
              <FiChevronRight size={20} />
            )}
          </button>
          <SourceIcon iconSize={20} sourceType={source} />
          {getSourceDisplayName(source)}
        </div>
      </TableCell>
      <TableCell className="py-4 w-[17.1%]">
        <div className="text-sm text-gray-500">Total Connectors</div>
        <div className="text-xl font-semibold">{summary.count}</div>
      </TableCell>
      <TableCell className="py-4 w-[17.1%]">
        <div className="text-sm text-gray-500">Active Connectors</div>
        <Tooltip
          content={`${summary.active} out of ${summary.count} connectors are active`}
        >
          <div className="flex items-center mt-1">
            <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${activePercentage}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium whitespace-nowrap">
              {summary.active} ({activePercentage.toFixed(0)}%)
            </span>
          </div>
        </Tooltip>
      </TableCell>
      <TableCell className="py-4 w-[17.1%]">
        <div className="text-sm text-gray-500">Public Connectors</div>
        <Tooltip
          content={`${summary.public} out of ${summary.count} connectors are public`}
        >
          <div className="flex text-xl font-semibolditems-center text-lg mt-1">
            <p>
              {summary.public}/{summary.count}
            </p>
          </div>
        </Tooltip>
      </TableCell>
      <TableCell className="py-4 w-[17.1%]">
        <div className="text-sm text-gray-500">Total Docs Indexed</div>
        <div className="text-xl font-semibold">
          {summary.totalDocsIndexed.toLocaleString()}
        </div>
      </TableCell>
      <TableCell>
        <CustomTooltip content="Some connectors did not index properly">
          <button className="flex gap-x-1.5 rounded p-2 cursor-pointer bg-error/80 text-white items-center border-error border border">
            <Warning className="h-4 w-4" />
            Errors
          </button>
        </CustomTooltip>
      </TableCell>

      <TableCell className="w-[14.5%]"></TableCell>
      <TableCell></TableCell>
    </TableRow>
  );
}

function ConnectorRow({
  ccPairsIndexingStatus,
}: {
  ccPairsIndexingStatus: any;
}) {
  const router = useRouter();
  const docsPerMinute = getDocsProcessedPerMinute(
    ccPairsIndexingStatus.latest_index_attempt
  )?.toFixed(2);

  const handleManageClick = (e: any) => {
    e.stopPropagation();
    router.push(`/admin/connector/${ccPairsIndexingStatus.cc_pair_id}`);
  };

  return (
    <TableRow
      className="hover:bg-hover-light w-full cursor-pointer relative"
      onClick={() =>
        router.push(`/admin/connector/${ccPairsIndexingStatus.cc_pair_id}`)
      }
    >
      <TableCell>
        <p className="w-[200px] ellipsis truncate">
          {ccPairsIndexingStatus.name}
        </p>
      </TableCell>
      <TableCell>
        <IndexAttemptStatus
          status={ccPairsIndexingStatus.last_status || "not_started"}
          errorMsg={ccPairsIndexingStatus?.latest_index_attempt?.error_msg}
          size="xs"
        />
      </TableCell>
      <TableCell>
        <Tooltip
          content={
            ccPairsIndexingStatus.connector.disabled ? "Inactive" : "Active"
          }
        >
          <div
            className={`w-3 h-3 rounded-full ${ccPairsIndexingStatus.connector.disabled ? "bg-red-500" : "bg-green-500"}`}
          ></div>
        </Tooltip>
      </TableCell>
      <TableCell>
        {ccPairsIndexingStatus.public_doc ? (
          <FiCheck className="my-auto text-emerald-600" size="18" />
        ) : (
          <FiXCircle className="my-auto text-red-600" />
        )}
      </TableCell>
      <TableCell>
        {timeAgo(ccPairsIndexingStatus?.last_success) || "-"}
      </TableCell>
      <TableCell>{ccPairsIndexingStatus.docs_indexed}</TableCell>
      <TableCell>
        <CustomTooltip content="Manage Connector">
          <FiSettings className="cursor-pointer" onClick={handleManageClick} />
        </CustomTooltip>
      </TableCell>
    </TableRow>
  );
}
export function CCPairIndexingStatusTable({
  ccPairsIndexingStatuses,
}: {
  ccPairsIndexingStatuses: ConnectorIndexingStatus<any, any>[];
}) {
  const [allToggleTracker, setAllToggleTracker] = useState(true);
  const [page, setPage] = useState(1);
  const [openSources, setOpenSources] = useState<Record<ValidSources, boolean>>(
    {} as Record<ValidSources, boolean>
  );

  const { groupedStatuses, sortedSources, groupSummaries } = useMemo(() => {
    const grouped: Record<ValidSources, ConnectorIndexingStatus<any, any>[]> =
      {} as Record<ValidSources, ConnectorIndexingStatus<any, any>[]>;
    ccPairsIndexingStatuses.forEach((status) => {
      const source = status.connector.source;
      if (!grouped[source]) {
        grouped[source] = [];
      }
      grouped[source].push(status);
    });

    const sorted = Object.keys(grouped).sort() as ValidSources[];

    const summaries: GroupedConnectorSummaries =
      {} as GroupedConnectorSummaries;
    sorted.forEach((source) => {
      const statuses = grouped[source];
      summaries[source] = {
        count: statuses.length,
        active: statuses.filter((status) => !status.connector.disabled).length,
        public: statuses.filter((status) => status.public_doc).length,
        totalDocsIndexed: statuses.reduce(
          (sum, status) => sum + status.docs_indexed,
          0
        ),
      };
    });

    return {
      groupedStatuses: grouped,
      sortedSources: sorted,
      groupSummaries: summaries,
    };
  }, [ccPairsIndexingStatuses]);

  const toggleSource = (source: ValidSources) => {
    setOpenSources((prev) => ({
      ...prev,
      [source]: !prev[source],
    }));
  };

  const toggleSources = (toggle: boolean) => {
    const updatedSources = Object.fromEntries(
      sortedSources.map((item) => [item, toggle])
    );
    setOpenSources(updatedSources as Record<ValidSources, boolean>);
    setAllToggleTracker(!toggle);
  };

  const router = useRouter();
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case "e":
            toggleSources(allToggleTracker);
            event.preventDefault();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [router, allToggleTracker]);

  const totalPages = Math.ceil(ccPairsIndexingStatuses.length / NUM_IN_PAGE);

  return (
    <div className="overflow-">
      {sortedSources.map((source, ind) => (
        <div key={ind}>
          <div className="shadow overflow-x-scroll text-sm bg-white rounded-lg ">
            <div className="!p-0 !m-0 w-full">
              <SummaryRow
                source={source}
                summary={groupSummaries[source]}
                isOpen={openSources[source] || false}
                onToggle={() => toggleSource(source)}
              />

              {openSources[source] && (
                <>
                  <TableRow className="bg-gray-50  w-full text-xs uppercase text-gray-500">
                    <TableHeaderCell className="py-2 w-1/4">
                      Name
                    </TableHeaderCell>
                    <TableHeaderCell className="py-2 w-1/6">
                      Status
                    </TableHeaderCell>
                    <TableHeaderCell className="py-2 w-1/12">
                      Active
                    </TableHeaderCell>
                    <TableHeaderCell className="py-2 w-1/12">
                      Public
                    </TableHeaderCell>
                    <TableHeaderCell className="py-2 w-1/6">
                      Last Indexed
                    </TableHeaderCell>
                    <TableHeaderCell className="py-2 w-1/6">
                      Docs Indexed
                    </TableHeaderCell>
                    <TableHeaderCell className="py-2 w-1/12">
                      Manage
                    </TableHeaderCell>
                  </TableRow>

                  {groupedStatuses[source].map((ccPairsIndexingStatus) => (
                    <ConnectorRow
                      key={ccPairsIndexingStatus.cc_pair_id}
                      ccPairsIndexingStatus={ccPairsIndexingStatus}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="mt-4"></div>
        </div>
      ))}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{page}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <PageSelector
                totalPages={totalPages}
                currentPage={page}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: "smooth",
                  });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
