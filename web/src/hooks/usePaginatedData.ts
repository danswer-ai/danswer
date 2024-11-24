import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface PaginationConfig<T> {
  itemsPerPage: number;
  batchSize: number;
  totalItems: number;
  fetchBatchFn: (batchNum: number, batchSize: number) => Promise<T[]>;
  refreshInterval?: number;
  baseUrl?: string;
  initialPage?: number;
  enableUrlSync?: boolean;
}

interface PaginatedDataState<T> {
  currentPageData: T[] | null;
  isLoading: boolean;
  error: Error | null;
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
  refresh: () => Promise<void>;
  cachedBatches: { [key: number]: T[][] };
}

export function usePaginatedData<T>({
  itemsPerPage,
  batchSize,
  totalItems,
  fetchBatchFn,
  refreshInterval = 5000,
  baseUrl,
  initialPage,
  enableUrlSync = true,
}: PaginationConfig<T>): PaginatedDataState<T> {
  const router = useRouter();
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const [currentPage, setCurrentPage] = useState(() => {
    if (initialPage) return initialPage;
    if (enableUrlSync && typeof window !== "undefined") {
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

  const ongoingRequestsRef = useRef<Set<number>>(new Set());

  // Batch fetching logic
  const fetchBatchData = useCallback(
    async (batchNum: number) => {
      if (ongoingRequestsRef.current.has(batchNum)) return;
      ongoingRequestsRef.current.add(batchNum);

      try {
        const data = await fetchBatchFn(batchNum + 1, batchSize * itemsPerPage);

        const newBatchData: T[][] = [];
        for (let i = 0; i < batchSize; i++) {
          const startIndex = i * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          const pageItems = data.slice(startIndex, endIndex);
          newBatchData.push(pageItems);
        }

        setCachedBatches((prev) => ({
          ...prev,
          [batchNum]: newBatchData,
        }));
      } catch (error) {
        setError(
          error instanceof Error
            ? error
            : new Error("An error occured while fetching batch data")
        );
      } finally {
        ongoingRequestsRef.current.delete(batchNum);
      }
    },
    [batchSize, itemsPerPage, fetchBatchFn]
  );

  // Page navigation with URL sync
  const goToPage = useCallback(
    (newPage: number) => {
      setCurrentPage(newPage);

      if (enableUrlSync && baseUrl) {
        router.replace(`${baseUrl}?page=${newPage}`, { scroll: false });
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }
    },
    [enableUrlSync, baseUrl, router]
  );

  // Loads current and adjacent batches
  useEffect(() => {
    const batchNum = Math.floor((currentPage - 1) / batchSize);

    if (!cachedBatches[batchNum]) {
      setIsLoading(true);
      fetchBatchData(batchNum);
    }

    const nextBatchNum = Math.min(
      batchNum + 1,
      Math.ceil(totalPages / batchSize) - 1
    );
    const prevBatchNum = Math.max(batchNum - 1, 0);

    if (!cachedBatches[nextBatchNum]) fetchBatchData(nextBatchNum);
    if (!cachedBatches[prevBatchNum]) fetchBatchData(prevBatchNum);
    if (!cachedBatches[0]) fetchBatchData(0);
  }, [currentPage, cachedBatches, totalPages, batchSize, fetchBatchData]);

  // Updates current page data from cache
  useEffect(() => {
    const batchNum = Math.floor((currentPage - 1) / batchSize);
    const batchPageNum = (currentPage - 1) % batchSize;

    if (cachedBatches[batchNum] && cachedBatches[batchNum][batchPageNum]) {
      setCurrentPageData(cachedBatches[batchNum][batchPageNum]);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, [currentPage, cachedBatches, batchSize]);

  // Manages periodic refresh
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      const batchNum = Math.floor((currentPage - 1) / batchSize);
      fetchBatchData(batchNum);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [currentPage, batchSize, refreshInterval, fetchBatchData]);

  // Manaual refresh function
  const refresh = useCallback(async () => {
    const batchNum = Math.floor((currentPage - 1) / batchSize);
    await fetchBatchData(batchNum);
  }, [currentPage, batchSize, fetchBatchData]);

  return {
    currentPageData,
    isLoading,
    error,
    currentPage,
    totalPages,
    goToPage,
    refresh,
    cachedBatches,
  };
}
