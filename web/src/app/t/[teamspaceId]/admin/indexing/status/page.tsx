"use client";

import useSWR from "swr";

import { LoadingAnimation, ThreeDotsLoader } from "@/components/Loading";
import { NotebookIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ConnectorIndexingStatus } from "@/lib/types";
import { AdminPageTitle } from "@/components/admin/Title";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { CCPairIndexingStatusTable } from "@/app/admin/indexing/status/CCPairIndexingStatusTable";
import { useConnectorCredentialIndexingStatus } from "@/lib/hooks";

  function Main() {
    const { teamspaceId } = useParams();
    const {
      data: indexAttemptData,
      isLoading: indexAttemptIsLoading,
      error: indexAttemptError,
    } = useConnectorCredentialIndexingStatus(undefined, false, teamspaceId);
    const {
      data: editableIndexAttemptData,
      isLoading: editableIndexAttemptIsLoading,
      error: editableIndexAttemptError,
    } = useConnectorCredentialIndexingStatus(undefined, true, teamspaceId);
  
    if (indexAttemptIsLoading || editableIndexAttemptIsLoading) {
      return <LoadingAnimation text="" />;
    }
  
    if (
      indexAttemptError ||
      !indexAttemptData ||
      editableIndexAttemptError ||
      !editableIndexAttemptData
    ) {
      return (
        <div className="text-error">
          {indexAttemptError?.info?.detail ||
            editableIndexAttemptError?.info?.detail ||
            "Error loading indexing history."}
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
      <CCPairIndexingStatusTable
        ccPairsIndexingStatuses={indexAttemptData}
        editableCcPairsIndexingStatuses={editableIndexAttemptData}
      />
    );
  }

export default function Status() {
  const { teamspaceId } = useParams();
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <AdminPageTitle
          icon={<NotebookIcon size={32} />}
          title="Existing Data Sources"
          farRightElement={
            <Link href={`/t/${teamspaceId}/admin/data-sources`}>
              <Button>Add Data Sources</Button>
            </Link>
          }
        />
        <Main />
      </div>
    </div>
  );
}
