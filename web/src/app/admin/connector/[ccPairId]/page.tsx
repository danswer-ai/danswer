"use client";

import { CCPairFullInfo } from "./types";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CCPairStatus } from "@/components/Status";
import { BackButton } from "@/components/BackButton";
import { Button, Divider, Title } from "@tremor/react";
import { IndexingAttemptsTable } from "./IndexingAttemptsTable";
import { ConfigDisplay } from "./ConfigDisplay";
import { ModifyStatusButtonCluster } from "./ModifyStatusButtonCluster";
import { DeletionButton } from "./DeletionButton";
import { ErrorCallout } from "@/components/ErrorCallout";
import { ReIndexButton } from "./ReIndexButton";
import { isCurrentlyDeleting } from "@/lib/documentDeletion";
import { ValidSources } from "@/lib/types";
import useSWR, { mutate } from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ThreeDotsLoader } from "@/components/Loading";
import CredentialSection from "@/components/credentials/CredentialSection";
import { buildCCPairInfoUrl } from "./lib";
import { SourceIcon } from "@/components/SourceIcon";
import { credentialTemplates } from "@/lib/connectors/credentials";
import { useState } from "react";
import { EditIcon } from "@/components/icons/icons";
import { updateConnectorName } from "@/lib/connector";

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

  const [editableName, setEditableName] = useState(ccPair?.name || "");
  const [isEditing, setIsEditing] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableName(e.target.value);
  };

  const handleUpdateName = async () => {
    // Add your update logic here, e.g., make an API call to update the name
    // After updating, you might want to refresh the data
    // await updateConnectorName(ccPairId, editableName);
    const d = await updateConnectorName(
      ccPair?.connector.id!,
      ccPair?.connector!,
      editableName
    );
    mutate(buildCCPairInfoUrl(ccPairId));
    setIsEditing(false);
  };

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

  const refresh = () => {
    mutate(buildCCPairInfoUrl(ccPairId));
  };

  const deleting =
    ccPair.latest_deletion_attempt?.status == "PENDING" ||
    ccPair.latest_deletion_attempt?.status == "STARTED";

  return (
    <>
      <BackButton />
      <div className="pb-1 flex mt-1">
        <div className="mr-2 my-auto ">
          <SourceIcon iconSize={24} sourceType={ccPair.connector.source} />
        </div>

        {isEditing ? (
          <div className="flex items-center">
            <input
              type="text"
              value={editableName}
              onChange={handleNameChange}
              className="text-2xl text-emphasis font-bold"
            />
            <Button onClick={handleUpdateName} className="ml-2">
              Update
            </Button>
            <Button onClick={() => setIsEditing(false)} className="ml-2">
              Cancel
            </Button>
          </div>
        ) : (
          <h1 className="group text-3xl text-emphasis font-bold">
            {ccPair.name}
            <button
              className="ml-2 group-hover:visible invisible "
              onClick={() => setIsEditing(true)}
            >
              <EditIcon />
            </button>
          </h1>
        )}
        {/* <h1 className="text-3xl text-emphasis font-bold">{ccPair.name} </h1> */}

        <div className="ml-auto flex gap-x-2">
          {!CONNECTOR_TYPES_THAT_CANT_REINDEX.includes(
            ccPair.connector.source
          ) && (
            <ReIndexButton
              ccPairId={ccPair.id}
              connectorId={ccPair.connector.id}
              credentialId={ccPair.credential.id}
              isDisabled={ccPair.connector.disabled}
              isDeleting={isDeleting}
            />
          )}
          {!deleting && <ModifyStatusButtonCluster ccPair={ccPair} />}
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
      {credentialTemplates[ccPair.connector.source] && (
        <>
          <Divider />

          <Title className="mb-2">Credentials</Title>

          <CredentialSection
            ccPair={ccPair}
            sourceType={ccPair.connector.source}
            refresh={() => refresh()}
          />
        </>
      )}
      <Divider />
      <ConfigDisplay
        connectorSpecificConfig={ccPair.connector.connector_specific_config}
        sourceType={ccPair.connector.source}
      />
      {/* NOTE: no divider / title here for `ConfigDisplay` since it is optional and we need
        to render these conditionally.*/}
      <div className="mt-6">
        <div className="flex">
          <Title>Indexing Attempts</Title>
        </div>
        <IndexingAttemptsTable ccPair={ccPair} />
      </div>
      <Divider />
      <div className="flex mt-4">
        <div className="mx-auto">
          <DeletionButton ccPair={ccPair} />
        </div>
      </div>
    </>
  );
}

export default function Page({ params }: { params: { ccPairId: string } }) {
  const ccPairId = parseInt(params.ccPairId);

  return (
    <div className="mx-auto container">
      <Main ccPairId={ccPairId} />
    </div>
  );
}
