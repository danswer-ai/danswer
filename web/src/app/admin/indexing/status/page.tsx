"use client";

import useSWR from "swr";

import { LoadingAnimation } from "@/components/Loading";
import { NotebookIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ConnectorIndexingStatus } from "@/lib/types";
import { CCPairIndexingStatusTable } from "./CCPairIndexingStatusTable";
import { AdminPageTitle } from "@/components/admin/Title";
import Link from "next/link";
import { Text } from "@tremor/react";
import { Button } from "@/components/ui/button";

function Main() {
  const {
    data: indexAttemptData,
    isLoading: indexAttemptIsLoading,
    error: indexAttemptError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    errorHandlingFetcher,
    { refreshInterval: 10000 } // 10 seconds
  );

  if (indexAttemptIsLoading) {
    return <LoadingAnimation text="" />;
  }

  if (indexAttemptError || !indexAttemptData) {
    return (
      <div className="text-error">
        {indexAttemptError?.info?.detail || "Error loading indexing history."}
      </div>
    );
  }

  if (indexAttemptData.length === 0) {
    return (
      <p>
        It looks like you don&apos;t have any connectors setup yet. Visit the{" "}
        <Link className="text-link" href="/admin/data-sources">
          Add Data Sources
        </Link>{" "}
        page to get started!
      </p>
    );
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
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <AdminPageTitle
          icon={<NotebookIcon size={32} />}
          title="Existing Data Sources"
          farRightElement={
            <Link href="/admin/data-sources">
              <Button>Add Data Sources</Button>
            </Link>
          }
        />
        <Main />
      </div>
    </div>
  );
}
