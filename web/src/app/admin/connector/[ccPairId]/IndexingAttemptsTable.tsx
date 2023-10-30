"use client";

import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
} from "@tremor/react";
import { IndexAttemptStatus } from "@/components/Status";
import { CCPairFullInfo } from "./types";
import { useState } from "react";
import { PageSelector } from "@/components/PageSelector";
import { localizeAndPrettify } from "@/lib/time";

const NUM_IN_PAGE = 8;

export function IndexingAttemptsTable({ ccPair }: { ccPair: CCPairFullInfo }) {
  const [page, setPage] = useState(1);

  // figure out if we need to artificially inflate the number of new docs indexed
  // for the ongoing indexing attempt. This is required since the total number of
  // docs indexed by a CC Pair is updated before the net new docs for an indexing
  // attempt. If we don't do this, there is a mismatch between these two numbers
  // which may confuse users.
  let newDocsIndexedAdjustment = 0;
  const sumOfNewDocs = ccPair.index_attempts.reduce(
    (partialSum, indexAttempt) => partialSum + indexAttempt.new_docs_indexed,
    0
  );
  if (
    sumOfNewDocs < ccPair.num_docs_indexed &&
    ccPair.index_attempts[0]?.status === "in_progress"
  ) {
    newDocsIndexedAdjustment = ccPair.num_docs_indexed - sumOfNewDocs;
  }

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Time Started</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Num New Docs</TableHeaderCell>
            <TableHeaderCell>Error Msg</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ccPair.index_attempts
            .slice(NUM_IN_PAGE * (page - 1), NUM_IN_PAGE * page)
            .map((indexAttempt, ind) => (
              <TableRow key={indexAttempt.id}>
                <TableCell>
                  {indexAttempt.time_started
                    ? localizeAndPrettify(indexAttempt.time_started)
                    : "-"}
                </TableCell>
                <TableCell>
                  <IndexAttemptStatus
                    status={indexAttempt.status || "not_started"}
                    size="xs"
                  />
                </TableCell>
                <TableCell>
                  {indexAttempt.new_docs_indexed +
                    (page === 1 && ind === 0 ? newDocsIndexedAdjustment : 0)}
                </TableCell>
                <TableCell>
                  <Text className="flex flex-wrap whitespace-normal">
                    {indexAttempt.error_msg || "-"}
                  </Text>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      {ccPair.index_attempts.length > NUM_IN_PAGE && (
        <div className="mt-3 flex">
          <div className="mx-auto">
            <PageSelector
              totalPages={Math.ceil(ccPair.index_attempts.length / NUM_IN_PAGE)}
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
      )}
    </>
  );
}
