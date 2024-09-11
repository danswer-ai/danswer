"use client";

import { CCPairFullInfo } from "./types";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CCPairStatus } from "@/components/Status";
import { BackButton } from "@/components/BackButton";
import { Divider, Title } from "@tremor/react";
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
      <div className="pb-5 flex flex-col sm:flex-row gap-4">
        <h1 className="text-3xl  font-bold">{ccPair.name}</h1>

        <div className="sm:ml-auto">
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
      <Divider />
      <ConfigDisplay
        connectorSpecificConfig={ccPair.connector.connector_specific_config}
        sourceType={ccPair.connector.source}
      />
      {/* NOTE: no divider / title here for `ConfigDisplay` since it is optional and we need
        to render these conditionally.*/}
      <Card className="mt-6">
        <CardHeader className="border-b sm:pb-10">
          <div className="flex items-start justify-between sm:items-center flex-col sm:flex-row gap-2">
            <h3 className="font-semibold">Indexing Attempts</h3>

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
        </CardHeader>
        <CardContent className="p-0">
          <IndexingAttemptsTable ccPair={ccPair} />
        </CardContent>
      </Card>
      <Divider />
      <div className="mt-4">
        <Title>Delete Connector</Title>
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
    <div className="py-24 md:py-32 lg:pt-16">
      <div>
        <HealthCheckBanner />
      </div>

      <Main ccPairId={ccPairId} />
    </div>
  );
}
