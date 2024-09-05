"use client";

import { useEffect, useRef } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
} from "@tremor/react";
import { CCPairFullInfo } from "./types";
import { IndexAttemptStatus } from "@/components/Status";
import { useState } from "react";
import { PageSelector } from "@/components/PageSelector";
import { ThreeDotsLoader } from "@/components/Loading";
import { buildCCPairInfoUrl } from "./lib";
import { localizeAndPrettify } from "@/lib/time";
import { getDocsProcessedPerMinute } from "@/lib/indexAttempt";
import { ErrorCallout } from "@/components/ErrorCallout";
import { SearchIcon } from "@/components/icons/icons";
import Link from "next/link";
import ExceptionTraceModal from "@/components/modals/ExceptionTraceModal";
import { PaginatedIndexAttempts } from "./types";
import { useRouter } from "next/navigation";

// This is the number of index attempts to display per page
const NUM_IN_PAGE = 8;
// This is the number of pages to fetch at a time
const CHUNK_SIZE = 8;

export function IndexingAttemptsTable({ ccPair }: { ccPair: CCPairFullInfo }) {
  const [indexAttemptTracePopupId, setIndexAttemptTracePopupId] = useState<
    number | null
  >(null);

  const totalPages = Math.ceil(ccPair.number_of_index_attempts / NUM_IN_PAGE);

  const router = useRouter();
  const [page, setPage] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return parseInt(urlParams.get("page") || "1", 10);
    }
    return 1;
  });

  const [currentPageData, setCurrentPageData] =
    useState<PaginatedIndexAttempts | null>(null);
  const [currentPageError, setCurrentPageError] = useState<Error | null>(null);
  const [isCurrentPageLoading, setIsCurrentPageLoading] = useState(false);

  // This is a cache of the data for each "chunk" which is a set of pages
  const [cachedChunks, setCachedChunks] = useState<{
    [key: number]: {
      [key: number]: PaginatedIndexAttempts;
    };
  }>({});

  // This is a set of the chunks that are currently being fetched
  // we use it to avoid duplicate requests
  const ongoingRequestsRef = useRef<Set<number>>(new Set());

  const urlBuilder = (chunkNum: number) =>
    `${buildCCPairInfoUrl(ccPair.id)}/index-attempts?page=${chunkNum}&page_size=${CHUNK_SIZE * NUM_IN_PAGE}`;

  // This fetches and caches the data for a given chunk number
  const fetchChunkData = async (chunkNum: number) => {
    if (ongoingRequestsRef.current.has(chunkNum)) return;
    ongoingRequestsRef.current.add(chunkNum);

    try {
      const response = await fetch(urlBuilder(chunkNum + 1));
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      const data = await response.json();

      const newChunkData: { [key: number]: PaginatedIndexAttempts } = {};
      for (let i = 0; i < CHUNK_SIZE; i++) {
        const startIndex = i * NUM_IN_PAGE;
        const endIndex = startIndex + NUM_IN_PAGE;
        const pageIndexAttempts = data.index_attempts.slice(
          startIndex,
          endIndex
        );
        newChunkData[i] = {
          ...data,
          index_attempts: pageIndexAttempts,
        };
      }

      setCachedChunks((prev) => ({
        ...prev,
        [chunkNum]: newChunkData,
      }));
    } catch (error) {
      setCurrentPageError(
        error instanceof Error ? error : new Error("An error occurred")
      );
    } finally {
      ongoingRequestsRef.current.delete(chunkNum);
    }
  };

  // This fetches and caches the data for the current chunk and the next and previous chunks
  useEffect(() => {
    const chunkNum = Math.floor((page - 1) / CHUNK_SIZE);

    if (!cachedChunks[chunkNum]) {
      setIsCurrentPageLoading(true);
      fetchChunkData(chunkNum);
    } else {
      setIsCurrentPageLoading(false);
    }

    const nextChunkNum = Math.min(
      chunkNum + 1,
      Math.ceil(totalPages / CHUNK_SIZE)
    );
    if (!cachedChunks[nextChunkNum]) {
      fetchChunkData(nextChunkNum);
    }

    const prevChunkNum = Math.max(chunkNum - 1, 0);
    if (!cachedChunks[prevChunkNum]) {
      fetchChunkData(prevChunkNum);
    }

    // Always fetch the first chunk if it's not cached
    if (!cachedChunks[0]) {
      fetchChunkData(0);
    }
  }, [ccPair.id, page, cachedChunks, totalPages]);

  // This updates the data on the current page
  useEffect(() => {
    const chunkNum = Math.floor((page - 1) / CHUNK_SIZE);
    const chunkPageNum = (page - 1) % CHUNK_SIZE;

    if (cachedChunks[chunkNum] && cachedChunks[chunkNum][chunkPageNum]) {
      setCurrentPageData(cachedChunks[chunkNum][chunkPageNum]);
      setIsCurrentPageLoading(false);
    } else {
      setIsCurrentPageLoading(true);
    }
  }, [page, cachedChunks]);

  // This updates the page number and manages the URL
  const updatePage = (newPage: number) => {
    setPage(newPage);
    router.push(`/admin/connector/${ccPair.id}?page=${newPage}`, {
      scroll: false,
    });
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  };

  if (isCurrentPageLoading || !currentPageData) {
    return <ThreeDotsLoader />;
  }

  if (currentPageError) {
    return (
      <ErrorCallout
        errorTitle={`Failed to fetch info on Connector with ID ${ccPair.id}`}
        errorMsg={currentPageError?.toString() || "Unknown error"}
      />
    );
  }

  // This is the index attempt that the user wants to view the trace for
  const indexAttemptToDisplayTraceFor = currentPageData?.index_attempts?.find(
    (indexAttempt) => indexAttempt.id === indexAttemptTracePopupId
  );

  return (
    <>
      {indexAttemptToDisplayTraceFor &&
        indexAttemptToDisplayTraceFor.full_exception_trace && (
          <ExceptionTraceModal
            onOutsideClick={() => setIndexAttemptTracePopupId(null)}
            exceptionTrace={indexAttemptToDisplayTraceFor.full_exception_trace!}
          />
        )}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Time Started</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>New Doc Cnt</TableHeaderCell>
            <TableHeaderCell>Total Doc Cnt</TableHeaderCell>
            <TableHeaderCell>Error Message</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {currentPageData.index_attempts.map((indexAttempt) => {
            const docsPerMinute =
              getDocsProcessedPerMinute(indexAttempt)?.toFixed(2);
            return (
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
                  {docsPerMinute && (
                    <div className="text-xs mt-1">
                      {docsPerMinute} docs / min
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex">
                    <div className="text-right">
                      <div>{indexAttempt.new_docs_indexed}</div>
                      {indexAttempt.docs_removed_from_index > 0 && (
                        <div className="text-xs w-52 text-wrap flex italic overflow-hidden whitespace-normal px-1">
                          (also removed {indexAttempt.docs_removed_from_index}{" "}
                          docs that were detected as deleted in the source)
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{indexAttempt.total_docs_indexed}</TableCell>
                <TableCell>
                  <div>
                    {indexAttempt.error_count > 0 && (
                      <Link
                        className="cursor-pointer my-auto"
                        href={`/admin/indexing/${indexAttempt.id}`}
                      >
                        <Text className="flex flex-wrap text-link whitespace-normal">
                          <SearchIcon />
                          &nbsp;View Errors
                        </Text>
                      </Link>
                    )}

                    {indexAttempt.status === "success" && (
                      <Text className="flex flex-wrap whitespace-normal">
                        {"-"}
                      </Text>
                    )}

                    {indexAttempt.status === "failed" &&
                      indexAttempt.error_msg && (
                        <Text className="flex flex-wrap whitespace-normal">
                          {indexAttempt.error_msg}
                        </Text>
                      )}

                    {indexAttempt.full_exception_trace && (
                      <div
                        onClick={() => {
                          setIndexAttemptTracePopupId(indexAttempt.id);
                        }}
                        className="mt-2 text-link cursor-pointer select-none"
                      >
                        View Full Trace
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="mt-3 flex">
          <div className="mx-auto">
            <PageSelector
              totalPages={totalPages}
              currentPage={page}
              onPageChange={updatePage}
            />
          </div>
        </div>
      )}
    </>
  );
}
