"use client";

import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@tremor/react";
import { CCPairStatus, IndexAttemptStatus } from "@/components/Status";
import React, { useState, useEffect } from 'react';
import { PageSelector } from "@/components/PageSelector";
import { timeAgo } from "@/lib/time";
import { ConnectorIndexingStatus } from "@/lib/types";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { ItemsPerPageSelector } from "@/components/admin/connectors/ItemsPerPageSelector";
import { getDocsProcessedPerMinute } from "@/lib/indexAttempt";
import Link from "next/link";
import { isCurrentlyDeleting } from "@/lib/documentDeletion";
import { FiEdit } from "react-icons/fi";

function CCPairIndexingStatusDisplay({
  ccPairsIndexingStatus,
}: {
  ccPairsIndexingStatus: ConnectorIndexingStatus<any, any>;
}) {
  if (ccPairsIndexingStatus.connector.disabled) {
    return (
      <CCPairStatus
        status="not_started"
        disabled={true}
        isDeleting={isCurrentlyDeleting(ccPairsIndexingStatus.deletion_attempt)}
      />
    );
  }

  const docsPerMinute = getDocsProcessedPerMinute(
    ccPairsIndexingStatus.latest_index_attempt
  )?.toFixed(2);
  return (
    <>
      <IndexAttemptStatus
        status={ccPairsIndexingStatus.last_status || "not_started"}
        errorMsg={ccPairsIndexingStatus?.latest_index_attempt?.error_msg}
        size="xs"
      />
      {ccPairsIndexingStatus?.latest_index_attempt?.new_docs_indexed &&
      ccPairsIndexingStatus?.latest_index_attempt?.status === "in_progress" ? (
        <div className="text-xs mt-0.5">
          <div>
            <i>Current Run:</i>{" "}
            {ccPairsIndexingStatus.latest_index_attempt.new_docs_indexed} docs
            indexed
          </div>
          <div>
            <i>Speed:</i>{" "}
            {docsPerMinute ? (
              <>{docsPerMinute} docs / min</>
            ) : (
              "calculating rate..."
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function CCPairIndexingStatusTable({
  ccPairsIndexingStatuses,
}: {
  ccPairsIndexingStatuses: ConnectorIndexingStatus<any, any>[];
}) {
  const [page, setPage] = useState(1);
  const [filterText, setFilterText] = useState('');
  const getInitialItemsPerPage = () => {
    try {
      const savedItemsPerPage = localStorage.getItem('itemsPerPage');
      return savedItemsPerPage ? Number(savedItemsPerPage) : 10;
    } catch (error) {
      console.error("Failed to load itemsPerPage from localStorage:", error);
      return 10; // Default value if error occurs
    }
  };
  const [itemsPerPage, setItemsPerPage] = useState(getInitialItemsPerPage());
  const filteredStatuses = ccPairsIndexingStatuses.filter(status =>
    status.connector.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const ccPairsIndexingStatusesForPage = filteredStatuses.slice(
    itemsPerPage * (page - 1),
    itemsPerPage * page
  );
  
  useEffect(() => {
    try {
      const savedItemsPerPage = localStorage.getItem('itemsPerPage');
      if (savedItemsPerPage) {
        const parsedItemsPerPage = Number(savedItemsPerPage);
        if (!isNaN(parsedItemsPerPage) && [10, 25, 50, 100].includes(parsedItemsPerPage)) {
          setItemsPerPage(parsedItemsPerPage);
        }
      }
    } catch (error) {
      console.error("Failed to load itemsPerPage from localStorage:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('itemsPerPage', itemsPerPage.toString());
    } catch (error) {
      console.error("Failed to save itemsPerPage in localStorage:", error);
    }
  
  }, [itemsPerPage]);
  useEffect(() => {
    setPage(1);
  }, [filterText, itemsPerPage]);

  return (
    <div>
      <input
        type="text"
        placeholder="Filter connectors..."
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        className="mb-4"
      />
      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Connector</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Last Indexed</TableHeaderCell>
            <TableHeaderCell>Docs Indexed</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ccPairsIndexingStatusesForPage.map((ccPairsIndexingStatus) => {
            return (
              <TableRow
                key={ccPairsIndexingStatus.cc_pair_id}
                className={
                  "hover:bg-hover-light bg-background cursor-pointer relative"
                }
              >
                <TableCell>
                  <div className="flex my-auto">
                    <FiEdit className="mr-4 my-auto" />
                    <div className="whitespace-normal break-all max-w-3xl">
                      <ConnectorTitle
                        connector={ccPairsIndexingStatus.connector}
                        ccPairId={ccPairsIndexingStatus.cc_pair_id}
                        ccPairName={ccPairsIndexingStatus.name}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <CCPairIndexingStatusDisplay
                    ccPairsIndexingStatus={ccPairsIndexingStatus}
                  />
                </TableCell>
                <TableCell>
                  {timeAgo(ccPairsIndexingStatus?.last_success) || "-"}
                </TableCell>
                <TableCell>{ccPairsIndexingStatus.docs_indexed}</TableCell>
                {/* Wrapping in <td> to avoid console warnings */}
                <td className="w-0 p-0">
                  <Link
                    href={`/admin/connector/${ccPairsIndexingStatus.cc_pair_id}`}
                    className="absolute w-full h-full left-0"
                  ></Link>
                </td>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex flex-col items-center mt-3">
        {ccPairsIndexingStatuses.length > itemsPerPage && (
          <PageSelector
            totalPages={Math.ceil(
              filteredStatuses.length / itemsPerPage
            )}
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
        )}
        <div className="flex items-center w-[20%] mt-2">
          <ItemsPerPageSelector
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(value) => setItemsPerPage(value)}
          />
        </div>  
      </div>
    </div>
  );
}
