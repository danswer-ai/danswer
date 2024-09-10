import { PageSelector } from "@/components/PageSelector";
import { IndexAttemptStatus } from "@/components/Status";
import { ConnectorIndexingStatus } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
} from "@tremor/react";
import Link from "next/link";
import { useState } from "react";
import { FiLink, FiMaximize2 } from "react-icons/fi";

export function FailedReIndexAttempts({
  reindexingProgress,
}: {
  reindexingProgress: ConnectorIndexingStatus<any, any>[];
}) {
  const numToDisplay = 10;
  const [page, setPage] = useState(1);

  return (
    <div className="mt-6 mb-8 p-4 border border-red-300 rounded-lg bg-red-50">
      <Text className="text-red-700 font-semibold mb-2">
        Failed Re-indexing Attempts
      </Text>
      <Text className="text-red-600 mb-4">
        The table below shows only the failed re-indexing attempts for existing
        connectors. These failures require immediate attention. Once all
        connectors have been re-indexed successfully, the new model will be used
        for all search queries.
      </Text>

      <div>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell className="w-1/7 sm:w-1/5">
                Connector Name
              </TableHeaderCell>
              <TableHeaderCell className="w-1/7 sm:w-1/5">
                Status
              </TableHeaderCell>
              <TableHeaderCell className="w-4/7 sm:w-2/5">
                Error Message
              </TableHeaderCell>
              <TableHeaderCell className="w-1/7 sm:w-2/5">
                Visit Connector
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reindexingProgress
              .slice(numToDisplay * (page - 1), numToDisplay * page)
              .map((reindexingProgress) => {
                return (
                  <TableRow key={reindexingProgress.name}>
                    <TableCell>
                      <Link
                        href={`/admin/connector/${reindexingProgress.cc_pair_id}`}
                        className="text-link cursor-pointer flex"
                      >
                        <FiMaximize2 className="my-auto mr-1" />
                        {reindexingProgress.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {reindexingProgress.latest_index_attempt?.status && (
                        <IndexAttemptStatus
                          status={
                            reindexingProgress.latest_index_attempt.status
                          }
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <div>
                        <Text className="flex flex-wrap whitespace-normal">
                          {reindexingProgress.error_msg || "-"}
                        </Text>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/connector/${reindexingProgress.cc_pair_id}`}
                        className="ctext-link cursor-pointer flex"
                      >
                        <FiLink className="my-auto mr-1" />
                        Visit Connector
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        <div className="mt-3 flex">
          <div className="mx-auto">
            <PageSelector
              totalPages={Math.ceil(reindexingProgress.length / numToDisplay)}
              currentPage={page}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
