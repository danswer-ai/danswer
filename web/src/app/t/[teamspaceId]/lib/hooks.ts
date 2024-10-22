import { errorHandlingFetcher } from "@/lib/fetcher";
import { ConnectorIndexingStatus } from "@/lib/types";
import { useParams } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";

export const useConnectorCredentialIndexingStatus = (
  refreshInterval = 30000 // 30 seconds
) => {
  const { mutate } = useSWRConfig();
  const { teamspaceId } = useParams();
  const INDEXING_STATUS_URL = `/api/manage/admin/connector/indexing-status?teamspace_id=${teamspaceId}`;

  const swrResponse = useSWR<ConnectorIndexingStatus<any, any>[]>(
    INDEXING_STATUS_URL,
    errorHandlingFetcher,
    { refreshInterval: refreshInterval }
  );

  return {
    ...swrResponse,
    refreshIndexingStatus: () => mutate(INDEXING_STATUS_URL),
  };
};
