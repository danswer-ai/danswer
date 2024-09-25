"use client";

import { CCPairStatus, IndexAttemptStatus } from "@/components/Status";
import { useEffect, useState } from "react";
import { PageSelector } from "@/components/PageSelector";
import { timeAgo } from "@/lib/time";
import { ConnectorIndexingStatus } from "@/lib/types";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { getDocsProcessedPerMinute } from "@/lib/indexAttempt";
import { useRouter } from "next/navigation";
import { isCurrentlyDeleting } from "@/lib/documentDeletion";
import { Pencil, CircleX, Check, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const NUM_IN_PAGE = 20;

function getOverallTotalDocs(
  ccPairsIndexingStatuses: ConnectorIndexingStatus<any, any>[]
): number | void {
  let totalDocs = 0;
  ccPairsIndexingStatuses.forEach(
    (ccPair: ConnectorIndexingStatus<any, any>) => {
      totalDocs += ccPair.docs_indexed || 0;
    }
  );
  return totalDocs;
}

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

function ClickableTableRow({
  url,
  children,
  ...props
}: {
  url: string;
  children: React.ReactNode;
  [key: string]: any;
}) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(url);
  }, [router]);

  const navigate = () => {
    router.push(url);
  };

  return (
    <TableRow {...props} onClick={navigate} className="cursor-pointer">
      {children}
    </TableRow>
  );
}

export function CCPairIndexingStatusTable({
  ccPairsIndexingStatuses,
}: {
  ccPairsIndexingStatuses: ConnectorIndexingStatus<any, any>[];
}) {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStatuses = ccPairsIndexingStatuses.filter(
    (status) =>
      status.name!.toLowerCase().includes(searchTerm.toLowerCase()) ||
      status.cc_pair_id.toString().includes(searchTerm)
  );

  const ccPairsIndexingStatusesForPage = filteredStatuses.slice(
    NUM_IN_PAGE * (page - 1),
    NUM_IN_PAGE * page
  );

  return (
    <div>
      <div className="relative md:w-[500px] mb-6">
        <Input
          className="pl-9"
          placeholder="Search existing connectors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2"
          size={15}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Connector</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Is Public</TableHead>
                <TableHead>Last Indexed</TableHead>
                <TableHead>Docs Indexed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ccPairsIndexingStatusesForPage.map((ccPairsIndexingStatus) => (
                <ClickableTableRow
                  key={ccPairsIndexingStatus.cc_pair_id}
                  url={`/admin/connector/${ccPairsIndexingStatus.cc_pair_id}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-2 my-auto">
                      <div className="p-4">
                        <Pencil size={16} />
                      </div>
                      <div className="whitespace-normal break-all max-w-lg">
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
                    {ccPairsIndexingStatus.public_doc ? (
                      <Check className="my-auto text-emerald-600" size="16" />
                    ) : (
                      <CircleX className="my-auto text-red-600" size="16" />
                    )}
                  </TableCell>
                  <TableCell>
                    {timeAgo(ccPairsIndexingStatus?.last_success) || "-"}
                  </TableCell>
                  <TableCell>{ccPairsIndexingStatus.docs_indexed}</TableCell>
                </ClickableTableRow>
              ))}
              <TableRow>
                <TableCell colSpan={5}>
                  Total documents indexed:{" "}
                  {getOverallTotalDocs(ccPairsIndexingStatusesForPage) || 0}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {filteredStatuses.length > NUM_IN_PAGE && (
            <div className="mt-3 flex">
              <div className="mx-auto">
                <PageSelector
                  totalPages={Math.ceil(filteredStatuses.length / NUM_IN_PAGE)}
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
        </CardContent>
      </Card>
    </div>
  );
}
