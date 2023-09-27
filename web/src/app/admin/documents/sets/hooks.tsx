import { errorHandlingFetcher } from "@/lib/fetcher";
import { DocumentSet } from "@/lib/types";
import useSWR, { mutate } from "swr";

export const useDocumentSets = () => {
  const url = "/api/manage/document-set";
  const swrResponse = useSWR<DocumentSet<any, any>[]>(
    url,
    errorHandlingFetcher
  );

  return {
    ...swrResponse,
    refreshDocumentSets: () => mutate(url),
  };
};
