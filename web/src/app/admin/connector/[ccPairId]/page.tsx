"use client";

import { CCPairFullInfo } from "./types";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CCPairStatus } from "@/components/Status";
import { BackButton } from "@/components/BackButton";
import { IndexingAttemptsTable } from "./IndexingAttemptsTable";
import { Text } from "@tremor/react";
import { ConfigDisplay } from "./ConfigDisplay";
import { ModifyStatusButtonCluster } from "./ModifyStatusButtonCluster";
import { DeletionButton } from "./DeletionButton";
import { ErrorCallout } from "@/components/ErrorCallout";
import { ReIndexButton } from "./ReIndexButton";
import { isCurrentlyDeleting } from "@/lib/documentDeletion";
import { ValidSources } from "@/lib/types";
import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ThreeDotsLoader } from "@/components/Loading";
import { buildCCPairInfoUrl } from "./lib";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// since the uploaded files are cleaned up after some period of time
// re-indexing will not work for the file connector. Also, it would not
// make sense to re-index, since the files will not have changed.
const CONNECTOR_TYPES_THAT_CANT_REINDEX: ValidSources[] = ["file"];

function Main({ ccPairId }: { ccPairId: number }) {
  const {
    data: ccPair,
    isLoading,
    error,
  } = useSWR<CCPairFullInfo>(
    buildCCPairInfoUrl(ccPairId),
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );

  if (isLoading) {
    return <ThreeDotsLoader />;
  }

  if (error || !ccPair) {
    return (
      <ErrorCallout
        errorTitle={`Failed to fetch info on Connector with ID ${ccPairId}`}
        errorMsg={error?.info?.detail || error.toString()}
      />
    );
  }

  const lastIndexAttempt = ccPair.index_attempts[0];
  const isDeleting = isCurrentlyDeleting(ccPair.latest_deletion_attempt);

  // figure out if we need to artificially deflate the number of docs indexed.
  // This is required since the total number of docs indexed by a CC Pair is
  // updated before the new docs for an indexing attempt. If we don't do this,
  // there is a mismatch between these two numbers which may confuse users.
  const totalDocsIndexed =
    lastIndexAttempt?.status === "in_progress" &&
    ccPair.index_attempts.length === 1
      ? lastIndexAttempt.total_docs_indexed
      : ccPair.num_docs_indexed;

  return (
    <>
      <BackButton />

      <div className="pb-5 flex flex-col items-start sm:flex-row lg:items-center gap-4 w-full">
        <h1 className="text-3xl font-bold truncate">{ccPair.name}</h1>

        <div className="sm:ml-auto flex-shrink-0">
          <ModifyStatusButtonCluster ccPair={ccPair} />
        </div>
      </div>

      <CCPairStatus
        status={lastIndexAttempt?.status || "not_started"}
        disabled={ccPair.connector.disabled}
        isDeleting={isDeleting}
      />
      <div className="text-sm pt-5">
        Total Documents Indexed: <b className="">{totalDocsIndexed}</b>
      </div>

      <ConfigDisplay
        connectorSpecificConfig={ccPair.connector.connector_specific_config}
        sourceType={ccPair.connector.source}
      />
      {/* NOTE: no divider / title here for `ConfigDisplay` since it is optional and we need
        to render these conditionally.*/}
      <div className="flex items-start justify-between sm:items-center flex-col sm:flex-row gap-2 mt-12 mb-4">
        <h3>Indexing Attempts</h3>

        {!CONNECTOR_TYPES_THAT_CANT_REINDEX.includes(
          ccPair.connector.source
        ) && (
          <ReIndexButton
            ccPairId={ccPair.id}
            connectorId={ccPair.connector.id}
            credentialId={ccPair.credential.id}
            isDisabled={ccPair.connector.disabled}
          />
        )}
      </div>
      {/*  <Card>
        <CardContent className="p-0"> */}
      <IndexingAttemptsTable ccPair={ccPair} />
      {/*      </CardContent>
      </Card> */}

      <div className="mt-12">
        <h3>Delete Connector</h3>
        <p className="text-sm text-subtle">
          Deleting the connector will also delete all associated documents.
        </p>

        <div className="flex mt-16">
          <div className="mx-auto">
            <DeletionButton ccPair={ccPair} />
          </div>
        </div>
      </div>
      {/* TODO: add document search*/}
    </>
  );
}

export default function Page({ params }: { params: { ccPairId: string } }) {
  const ccPairId = parseInt(params.ccPairId);

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <Main ccPairId={ccPairId} />
      </div>
    </div>
  );
}
