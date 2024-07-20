"use client";

import { CCPairFullInfo } from "./types";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CCPairStatus } from "@/components/Status";
import { BackButton } from "@/components/BackButton";
import { Button, Divider, Title } from "@tremor/react";
import { IndexingAttemptsTable } from "./IndexingAttemptsTable";
import { Text } from "@tremor/react";
import { ConfigDisplay } from "./ConfigDisplay";
import { ModifyStatusButtonCluster } from "./ModifyStatusButtonCluster";
import { DeletionButton } from "./DeletionButton";
import { ErrorCallout } from "@/components/ErrorCallout";
import { ReIndexButton } from "./ReIndexButton";
import { isCurrentlyDeleting } from "@/lib/documentDeletion";
import {
  ConfluenceCredentialJson,
  Credential,
  ValidSources,
} from "@/lib/types";
import useSWR, { mutate } from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ThreeDotsLoader } from "@/components/Loading";
import { buildCCPairInfoUrl } from "./lib";
import { FaSwatchbook } from "react-icons/fa";
import { NewChatIcon } from "@/components/icons/icons";
import ModifyCredentialModal from "./ModifyCredentialModal";
import { useState } from "react";
import CreateCredentialModal from "./CreateCredentialModal";
import {
  deleteCredential,
  swapCredential,
  updateCredential,
} from "@/lib/credential";
import EditCredentialModal from "./EditCredentialModal";
import { usePopup } from "@/components/admin/connectors/Popup";

// since the uploaded files are cleaned up after some period of time
// re-indexing will not work for the file connector. Also, it would not
// make sense to re-index, since the files will not have changed.
const CONNECTOR_TYPES_THAT_CANT_REINDEX: ValidSources[] = ["file"];

function Main({ ccPairId }: { ccPairId: number }) {
  const { popup, setPopup } = usePopup();

  const [showModifyCredential, setShowModifyCredential] = useState(false);
  const [showCreateCredential, setShowCreateCredential] = useState(false);
  const [editingCredential, setEditingCredential] =
    useState<Credential<ConfluenceCredentialJson> | null>(null);

  const closeModifyCredential = () => {
    setShowModifyCredential(false);
  };

  const closeCreateCredential = () => {
    setShowCreateCredential(false);
  };

  const closeEditingCredential = () => {
    setEditingCredential(null);
    setShowModifyCredential(true);
  };
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

  const makeShowCreateCredential = () => {
    setShowModifyCredential(false);
    setShowCreateCredential(true);
  };

  const onSwap = async (selectedCredentialId: number, connectorId: number) => {
    await swapCredential(selectedCredentialId, connectorId);
    mutate(buildCCPairInfoUrl(ccPairId));

    setPopup({
      message: "Swapped credential succesfully!",
      type: "success",
    });
  };

  const onUpdateCredential = async (
    selectedCredential: Credential<any | null>,
    details: any,
    onSucces: () => void
  ) => {
    const response = await updateCredential(selectedCredential.id, details);
    if (response.ok) {
      setPopup({
        message: "Updated credential",
        type: "success",
      });
      onSucces();
    } else {
      setPopup({
        message: "Issue updating credential",
        type: "error",
      });
    }
  };

  const onEditCredential = (
    credential: Credential<ConfluenceCredentialJson>
  ) => {
    closeModifyCredential();
    setEditingCredential(credential);
  };

  const onDeleteCredential = async (credential: Credential<any | null>) => {
    await deleteCredential(credential.id);
    mutate(buildCCPairInfoUrl(ccPairId));
  };

  return (
    <>
      <BackButton />
      {popup}
      <div className="pb-1 flex mt-1">
        <h1 className="text-3xl text-emphasis font-bold">{ccPair.name}</h1>

        <div className="ml-auto flex gap-x-2">
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
      <Title className="mb-2">Credentials</Title>
      {/* <div className="flex gap-x-2"> */}
      <div className="flex justify-start flex-col gap-y-2">
        <div className="flex gap-x-2">
          <p>Current credential:</p>
          <Text className="ml-1 italic my-auto">
            {
              (ccPair.credential.credential_json as ConfluenceCredentialJson)
                .confluence_access_token
            }
          </Text>
        </div>
        <div className="flex text-sm justify-start mr-auto gap-x-2">
          <button
            onClick={() => setShowModifyCredential(true)}
            className="flex items-center gap-x-2 cursor-pointer bg-neutral-100 border-border border-2 hover:bg-border p-1.5 rounded-lg text-neutral-700"
          >
            <FaSwatchbook />
            Swap credential
          </button>
          <button
            onClick={() => setShowCreateCredential(true)}
            className="flex items-center gap-x-2 cursor-pointer bg-neutral-100 border-border border-2 hover:bg-border p-1.5 rounded-lg text-neutral-700"
          >
            <NewChatIcon />
            New Credential
          </button>
        </div>
      </div>

      {showModifyCredential && (
        <>
          <ModifyCredentialModal
            setPopup={setPopup}
            onDeleteCredential={onDeleteCredential}
            onEditCredential={(
              credential: Credential<ConfluenceCredentialJson>
            ) => onEditCredential(credential)}
            connectorId={ccPair.connector.id}
            credentialId={ccPair.credential.id}
            id={ccPairId}
            onSwap={onSwap}
            onCreateNew={() => makeShowCreateCredential()}
            onClose={() => closeModifyCredential()}
          />
        </>
      )}

      {editingCredential && (
        <EditCredentialModal
          onUpdate={onUpdateCredential}
          setPopup={setPopup}
          credential={editingCredential}
          onClose={closeEditingCredential}
        />
      )}

      {showCreateCredential && (
        <CreateCredentialModal
          connectorId={ccPair.connector.id}
          setPopup={setPopup}
          onSwap={onSwap}
          onCreateNew={() => makeShowCreateCredential()}
          id={ccPairId}
          onClose={closeCreateCredential}
        />
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
      {/* TODO: add document search*/}
    </>
  );
}

export default function Page({ params }: { params: { ccPairId: string } }) {
  const ccPairId = parseInt(params.ccPairId);

  return (
    <div className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>

      <Main ccPairId={ccPairId} />
    </div>
  );
}
