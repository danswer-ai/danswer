"use client";

import useSWR from "swr";

import { LoadingAnimation } from "@/components/Loading";
import { NotebookIcon } from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { ConnectorIndexingStatus } from "@/lib/types";
import { CCPairIndexingStatusTable } from "./CCPairIndexingStatusTable";
import { Divider } from "@tremor/react";

function Main() {
  const {
    data: indexAttemptData,
    isLoading: indexAttemptIsLoading,
    error: indexAttemptIsError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    fetcher,
    { refreshInterval: 10000 } // 10 seconds
  );

  if (indexAttemptIsLoading) {
    return <LoadingAnimation text="" />;
  }

  if (indexAttemptIsError || !indexAttemptData) {
    return <div className="text-red-600">Error loading indexing history.</div>;
  }

  // sort by source name
  indexAttemptData.sort((a, b) => {
    if (a.connector.source < b.connector.source) {
      return -1;
    } else if (a.connector.source > b.connector.source) {
      return 1;
    } else {
      return 0;
    }
  });

  return (
    <CCPairIndexingStatusTable ccPairsIndexingStatuses={indexAttemptData} />
  );
}

export default function Status() {
  return (
    <div className="mx-auto container dark">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <h1 className="text-3xl font-bold flex gap-x-2 mb-2">
        <NotebookIcon size={32} /> Indexing Status
      </h1>
      <Divider />
      <Main />
    </div>
  );
}
