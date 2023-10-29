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

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Time</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Num New Docs</TableHeaderCell>
            <TableHeaderCell>Error Msg</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ccPair.index_attempts
            .slice(NUM_IN_PAGE * (page - 1), NUM_IN_PAGE * page)
            .map((indexAttempt) => (
              <TableRow key={indexAttempt.id}>
                <TableCell>
                  {localizeAndPrettify(indexAttempt.time_updated)}
                </TableCell>
                <TableCell>
                  <IndexAttemptStatus
                    status={indexAttempt.status || "not_started"}
                    size="xs"
                  />
                </TableCell>
                <TableCell>{indexAttempt.new_docs_indexed}</TableCell>
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
