import { errorHandlingFetcher } from "@/lib/fetcher";
import { DocumentSet } from "@/lib/types";
import useSWR, { mutate } from "swr";

export function useDocumentSets() {
  const url = "/api/manage/admin/document-set";
  const swrResponse = useSWR<DocumentSet[]>(url, errorHandlingFetcher, {
    refreshInterval: 5000, // 5 seconds
  });

  return {
    ...swrResponse,
    refreshDocumentSets: () => mutate(url),
  };
}
