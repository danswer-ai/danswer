import { PageSelector } from "@/components/PageSelector";
import { IndexAttemptStatus } from "@/components/Status";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConnectorIndexingStatus } from "@/lib/types";
import { Maximize2 } from "lucide-react";

import Link from "next/link";
import { useState } from "react";

export function ReindexingProgressTable({
  reindexingProgress,
}: {
  reindexingProgress: ConnectorIndexingStatus<any, any>[];
}) {
  const numToDisplay = 10;
  const [page, setPage] = useState(1);

  return (
    <div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Connector Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Docs Re-Indexed</TableHead>
                <TableHead>Error Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reindexingProgress
                .slice(numToDisplay * (page - 1), numToDisplay * page)
                .map((reindexingProgress) => {
                  return (
                    <TableRow key={reindexingProgress.name}>
                      <TableCell>
                        <Link
                          href={`/admin/connector/${reindexingProgress.cc_pair_id}`}
                          className="text-link cursor-pointer flex whitespace-normal break-all"
                        >
                          <Maximize2
                            className="my-auto mr-2 shrink-0"
                            size={16}
                          />
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
                        {reindexingProgress?.latest_index_attempt
                          ?.total_docs_indexed || "-"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="flex flex-wrap whitespace-normal">
                            {reindexingProgress.error_msg || "-"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
  );
}
