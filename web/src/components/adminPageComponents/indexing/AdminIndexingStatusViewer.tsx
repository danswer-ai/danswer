import useSWR from "swr";

import { LoadingAnimation } from "@/components/Loading";
import { fetcher } from "@/lib/fetcher";
import { ConnectorIndexingStatus } from "@/lib/types";
import { CCPairIndexingStatusTable } from "@/components/adminPageComponents/indexing/AdminIndexingCCPairStatusTable";
import Link from "next/link";
import { Text } from "@tremor/react";

const REFRESH_INTERVAL = 10000;

export default function StatusViewer() {
    const {
      data: indexAttemptData,
      isLoading: indexAttemptIsLoading,
      error: indexAttemptIsError,
    } = useSWR<ConnectorIndexingStatus<any, any>[]>(
      "/api/manage/admin/connector/indexing-status",
      fetcher,
      { refreshInterval: REFRESH_INTERVAL }
    );

    indexAttemptData?.sort((a, b) => {
        if (a.connector.source < b.connector.source) {
          return -1;
        } else if (a.connector.source > b.connector.source) {
          return 1;
        } else {
          return 0;
        }
      });


    return (
      <>
        { indexAttemptIsLoading && <LoadingAnimation text="" />}
        { indexAttemptData && <CCPairIndexingStatusTable ccPairsIndexingStatuses={indexAttemptData} />}
        {indexAttemptIsError || !indexAttemptData && <div className="text-red-600">Error loading indexing history.</div>}
        {indexAttemptData?.length === 0 && ( 
        <Text>
          It looks like you don&apos;t have any connectors setup yet. Visit the{" "}
          <Link className="text-blue-500" href="/admin/add-connector">
            Add Connector
          </Link>{" "}
          page to get started!
        </Text>)
        }
      </>
    );
}