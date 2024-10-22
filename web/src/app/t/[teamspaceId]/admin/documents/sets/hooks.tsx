import { errorHandlingFetcher } from "@/lib/fetcher";
import { DocumentSet } from "@/lib/types";
import { useParams } from "next/navigation";
import useSWR, { mutate } from "swr";

export function refreshDocumentSets(teamspaceId: string | string[]) {
  const DOCUMENT_SETS_URL = `/api/manage/admin/document-set?teamspace_id=${teamspaceId}`;
  mutate(DOCUMENT_SETS_URL);
}

export function useDocumentSets() {
  const { teamspaceId } = useParams();
  const DOCUMENT_SETS_URL = `/api/manage/admin/document-set?teamspace_id=${teamspaceId}`;

  const swrResponse = useSWR<DocumentSet[]>(
    DOCUMENT_SETS_URL,
    errorHandlingFetcher,
    {
      refreshInterval: 5000, // 5 seconds
    }
  );

  return {
    ...swrResponse,
    refreshDocumentSets: () => refreshDocumentSets(teamspaceId),
  };
}
