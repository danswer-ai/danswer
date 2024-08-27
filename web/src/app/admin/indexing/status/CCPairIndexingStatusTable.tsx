/* "use client";

import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@tremor/react";
import { CCPairStatus, IndexAttemptStatus } from "@/components/Status";
import { useEffect, useState } from "react";
import { PageSelector } from "@/components/PageSelector";
import { timeAgo } from "@/lib/time";
import { ConnectorIndexingStatus } from "@/lib/types";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { getDocsProcessedPerMinute } from "@/lib/indexAttempt";
import { useRouter } from "next/navigation";
import { isCurrentlyDeleting } from "@/lib/documentDeletion";
import { FiCheck, FiEdit2, FiXCircle } from "react-icons/fi";
import { Pencil } from "lucide-react";

const NUM_IN_PAGE = 20;

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
  [key: string]: any; // This allows for any additional props
}) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(url);
  }, [router]);

  const navigate = () => {
    router.push(url);
  };

  return (
    <TableRow {...props} onClick={navigate}>
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
  const ccPairsIndexingStatusesForPage = ccPairsIndexingStatuses.slice(
    NUM_IN_PAGE * (page - 1),
    NUM_IN_PAGE * page
  );

  return (
    <div>
      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Connector</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Is Public</TableHeaderCell>
            <TableHeaderCell>Last Indexed</TableHeaderCell>
            <TableHeaderCell>Docs Indexed</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ccPairsIndexingStatusesForPage.map((ccPairsIndexingStatus) => {
            return (
              <ClickableTableRow
                url={`/admin/connector/${ccPairsIndexingStatus.cc_pair_id}`}
                key={ccPairsIndexingStatus.cc_pair_id}
                className={
                  "hover:bg-hover-light bg-background cursor-pointer relative"
                }
              >
                <TableCell>
                  <div className="flex my-auto">
                    <Pencil size={16} className="mr-4 my-auto" />
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
              </ClickableTableRow>
            );
          })}
        </TableBody>
      </Table>
      {ccPairsIndexingStatuses.length > NUM_IN_PAGE && (
        <div className="mt-3 flex">
          <div className="mx-auto">
            <PageSelector
              totalPages={Math.ceil(
                ccPairsIndexingStatuses.length / NUM_IN_PAGE
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
          </div>
        </div>
      )}
    </div>
  );
} */

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
import { FiCheck, FiEdit2, FiXCircle } from "react-icons/fi";
import { Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const NUM_IN_PAGE = 20;

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
  [key: string]: any; // This allows for any additional props
}) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(url);
  }, [router]);

  const navigate = () => {
    router.push(url);
  };

  return (
    <TableRow {...props} onClick={navigate}>
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
  const ccPairsIndexingStatusesForPage = ccPairsIndexingStatuses.slice(
    NUM_IN_PAGE * (page - 1),
    NUM_IN_PAGE * page
  );

  return (
    <div>
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
          {ccPairsIndexingStatusesForPage.map((ccPairsIndexingStatus) => {
            return (
              <TableRow key={ccPairsIndexingStatus.cc_pair_id}>
                <TableCell>
                  <div className="flex items-center gap-2 my-auto">
                    <a
                      href={`/admin/connector/${ccPairsIndexingStatus.cc_pair_id}`}
                    >
                      <Button
                        variant="ghost"
                        size="xs"
                        className="!p-1.5 !px-[7px]"
                      >
                        <Pencil size={16} />
                      </Button>
                    </a>

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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {ccPairsIndexingStatuses.length > NUM_IN_PAGE && (
        <div className="mt-3 flex">
          <div className="mx-auto">
            <PageSelector
              totalPages={Math.ceil(
                ccPairsIndexingStatuses.length / NUM_IN_PAGE
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
          </div>
        </div>
      )}
    </div>
  );
}
