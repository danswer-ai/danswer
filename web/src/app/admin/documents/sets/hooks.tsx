import { errorHandlingFetcher } from "@/lib/fetcher";
import { DocumentSet } from "@/lib/types";
import useSWR, { mutate } from "swr";

const DOCUMENT_SETS_URL = "/api/manage/admin/document-set";

export function refreshDocumentSets() {
  mutate(DOCUMENT_SETS_URL);
}

export function useDocumentSets(
  getEditable: boolean = false,
  teamspaceId?: string | string[]
) {
  const url = `${DOCUMENT_SETS_URL}?${
    getEditable ? "get_editable=true" : ""
  }${getEditable && teamspaceId ? "&" : ""}${
    teamspaceId ? `teamspace_id=${teamspaceId}` : ""
  }`.replace(/&$/, "");

  const swrResponse = useSWR<DocumentSet[]>(url, errorHandlingFetcher, {
    refreshInterval: 5000, // 5 seconds
  });

  return {
    ...swrResponse,
    refreshDocumentSets: refreshDocumentSets,
  };
}
