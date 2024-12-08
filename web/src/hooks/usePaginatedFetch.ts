import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

interface PaginatedApiResponse<T> {
  items: T[];
  totalItems: number;
}

interface PaginationConfig<T> {
  itemsPerPage: number;
  pagesPerBatch: number;
  endpoint: string;
  query?: string;
  filter?: Record<string, string | boolean | number | string[]>;
  refreshIntervalInMs?: number;
}

interface PaginatedHookReturnData<T> {
  currentPageData: T[] | null;
  isLoading: boolean;
  error: Error | null;
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
  refresh: () => Promise<void>;
  hasNoData: boolean;
}

export function usePaginatedFetch<T>({
  itemsPerPage,
  pagesPerBatch,
  endpoint,
  query,
  filter,
  refreshIntervalInMs = 5000,
}: PaginationConfig<T>): PaginatedHookReturnData<T> {
  const router = useRouter();

  // State to initialize and hold the current page number
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return parseInt(urlParams.get("page") || "1", 10);
    }
    return 1;
  });
  const [currentPageData, setCurrentPageData] = useState<T[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cachedBatches, setCachedBatches] = useState<{ [key: number]: T[][] }>(
    {}
  );
  const [totalItems, setTotalItems] = useState<number>(0);

  // Tracks ongoing requests to avoid duplicate requests, uses ref to persist across renders
  const ongoingRequestsRef = useRef<Set<number>>(new Set());

  const totalPages = useMemo(() => {
    if (totalItems === 0) return 1;
    return Math.ceil(totalItems / itemsPerPage);
  }, [totalItems, itemsPerPage]);

  // Calculates which batch we're in, and which page within that batch
  const batchAndPageIndices = useMemo(() => {
    const batchNum = Math.floor((currentPage - 1) / pagesPerBatch);
    const batchPageNum = (currentPage - 1) % pagesPerBatch;
    return { batchNum, batchPageNum };
  }, [currentPage, pagesPerBatch]);

  // Checks if the cache is empty and that we're not loading data
  const hasNoData = useMemo(() => {
    if (isLoading) return false;
    return (
      Object.keys(cachedBatches).length === 0 ||
      Object.values(cachedBatches).every((batch) =>
        batch.every((page) => page.length === 0)
      )
    );
  }, [cachedBatches]);

  const currentPath = usePathname();

  // Fetches a batch of data and stores it in the cache
  const fetchBatchData = useCallback(
    async (batchNum: number) => {
      // Prevents duplicate requests
      if (ongoingRequestsRef.current.has(batchNum)) {
        return;
      }
      ongoingRequestsRef.current.add(batchNum);

      try {
        // Builds the query params, including pagination and filtering
        const params = new URLSearchParams({
          page: (batchNum + 1).toString(),
          page_size: (pagesPerBatch * itemsPerPage).toString(),
        });

        if (query) params.set("q", query);

        if (filter) {
          for (const [key, value] of Object.entries(filter)) {
            if (Array.isArray(value)) {
              value.forEach((str) => params.append(key, str));
            } else {
              params.set(key, value.toString());
            }
          }
        }

        const response = await fetch(`${endpoint}?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch data");
        const responseData: PaginatedApiResponse<T> = await response.json();

        const { items, totalItems } = responseData;

        if (totalItems !== undefined) {
          setTotalItems(totalItems);
        }
        // Splits a batch into pages
        const pagesInBatch = Array.from({ length: pagesPerBatch }, (_, i) => {
          const startIndex = i * itemsPerPage;
          return items.slice(startIndex, startIndex + itemsPerPage);
        });

        setCachedBatches((prev) => ({
          ...prev,
          [batchNum]: pagesInBatch,
        }));
      } catch (error) {
        setError(
          error instanceof Error ? error : new Error("Error fetching data")
        );
      } finally {
        ongoingRequestsRef.current.delete(batchNum);
      }
    },
    [endpoint, pagesPerBatch, itemsPerPage, query, filter]
  );

  // Updates the URL with the current page number
  const updatePageUrl = useCallback(
    (page: number) => {
      if (currentPath) {
        router.replace(`${currentPath}?page=${page}`, { scroll: false });
      }
    },
    [currentPath, router]
  );

  // Updates the current page
  const goToPage = useCallback(
    (newPage: number) => {
      setCurrentPage(newPage);
      updatePageUrl(newPage);
    },
    [updatePageUrl]
  );

  // Loads the current and adjacent batches
  useEffect(() => {
    const { batchNum } = batchAndPageIndices;
    const nextBatchNum = batchNum + 1;
    const prevBatchNum = Math.max(batchNum - 1, 0);

    if (!cachedBatches[batchNum]) {
      setIsLoading(true);
      fetchBatchData(batchNum);
    }

    // Possible total number of items including the next batch
    const totalItemsIncludingNextBatch =
      nextBatchNum * pagesPerBatch * itemsPerPage;
    // Preload next batch if we're not on the last batch
    if (
      totalItemsIncludingNextBatch <= totalItems &&
      !cachedBatches[nextBatchNum]
    ) {
      fetchBatchData(nextBatchNum);
    }

    // Load previous batch if missing
    if (!cachedBatches[prevBatchNum]) {
      fetchBatchData(prevBatchNum);
    }

    // Ensure first batch is always loaded
    if (!cachedBatches[0]) {
      fetchBatchData(0);
    }
  }, [currentPage, cachedBatches, totalPages, pagesPerBatch, fetchBatchData]);

  // Updates current page data from the cache
  useEffect(() => {
    const { batchNum, batchPageNum } = batchAndPageIndices;

    if (cachedBatches[batchNum] && cachedBatches[batchNum][batchPageNum]) {
      setCurrentPageData(cachedBatches[batchNum][batchPageNum]);
      setIsLoading(false);
    }
  }, [currentPage, cachedBatches, pagesPerBatch]);

  // Implements periodic refresh
  useEffect(() => {
    if (!refreshIntervalInMs) return;

    const interval = setInterval(() => {
      const { batchNum } = batchAndPageIndices;
      fetchBatchData(batchNum);
    }, refreshIntervalInMs);

    return () => clearInterval(interval);
  }, [currentPage, pagesPerBatch, refreshIntervalInMs, fetchBatchData]);

  // Manually refreshes the current batch
  const refresh = useCallback(async () => {
    const { batchNum } = batchAndPageIndices;
    await fetchBatchData(batchNum);
  }, [currentPage, pagesPerBatch, fetchBatchData]);

  // Cache invalidation
  useEffect(() => {
    setCachedBatches({});
    setTotalItems(0);
    goToPage(1);
  }, [currentPath, query, filter]);

  return {
    currentPage,
    currentPageData,
    totalPages,
    goToPage,
    refresh,
    isLoading,
    error,
    hasNoData,
  };
}
