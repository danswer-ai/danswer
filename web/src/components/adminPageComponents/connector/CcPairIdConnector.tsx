"use client";

import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ThreeDotsLoader } from "@/components/Loading";
import { buildCCPairInfoUrl } from "@/lib/connector/helpers";
import { ValidSources } from "@/lib/types";


import { CCPairStatus } from "@/components/Status";
import { BackButton } from "@/components/BackButton";
import { Divider, Title } from "@tremor/react";
import { IndexingAttemptsTable } from "@/components/adminPageComponents/single-connector/AdminSingleConnectorIndexingAttemptsTable";
import { Text } from "@tremor/react";
import { ConfigDisplay } from "@/components/adminPageComponents/single-connector/AdminSingleConnectorConfigDisplay";
import { ModifyStatusButtonCluster } from "@/components/adminPageComponents/single-connector/AdminSingleConnectorModifyStatusButtonCluster";
import { DeletionButton } from "@/components/adminPageComponents/single-connector/AdminSingleConnectorDeletionButton";
import { ErrorCallout } from "@/components/ErrorCallout";
import { ReIndexButton } from "@/components/adminPageComponents/single-connector/AdminSingleConnectorReIndexButton";
import { isCurrentlyDeleting } from "@/lib/documentDeletion";

import { CCPairFullInfo } from "@/interfaces/connector/interfaces";

const CONNECTOR_TYPES_THAT_CANT_REINDEX: ValidSources[] = ["file"];

export default function CcPairIdConnector({ ccPairId }: { ccPairId: number }) {
    const {
      data: ccPair,
      isLoading,
      error,
    } = useSWR<CCPairFullInfo>(
      buildCCPairInfoUrl(ccPairId),
      errorHandlingFetcher,
      { refreshInterval: 5000 }
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
  
    const totalDocsIndexed =
      lastIndexAttempt?.status === "in_progress" &&
      ccPair.index_attempts.length === 1
        ? lastIndexAttempt.total_docs_indexed
        : ccPair.num_docs_indexed;
  
    return (
      <>
        <BackButton />
        <div className="pb-1 flex mt-1">
          <h1 className="text-3xl text-emphasis font-bold">{ccPair.name}</h1>
  
          <div className="ml-auto">
            <ModifyStatusButtonCluster ccPair={ccPair} />
          </div>
        </div>
  
        <CCPairStatus
          status={lastIndexAttempt?.status || "not_started"}
          disabled={ccPair.connector.disabled}
          isDeleting={isDeleting}
        />
  
        <div className="text-sm mt-1">
          Total Documents Indexed:{" "}
          <b className="text-emphasis">{totalDocsIndexed}</b>
        </div>
  
        <Divider />
  
        <ConfigDisplay
          connectorSpecificConfig={ccPair.connector.connector_specific_config}
          sourceType={ccPair.connector.source}
        />
  
        <div className="mt-6">
          <div className="flex">
            <Title>Indexing Attempts</Title>
  
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
  
          <IndexingAttemptsTable ccPair={ccPair} />
        </div>
  
        <Divider />
  
        <div className="mt-4">
          <Title>Delete Connector</Title>
          <Text>
            Deleting the connector will also delete all associated documents.
          </Text>
  
          <div className="flex mt-16">
            <div className="mx-auto">
              <DeletionButton ccPair={ccPair} />
            </div>
          </div>
        </div>
      </>
    );
  }