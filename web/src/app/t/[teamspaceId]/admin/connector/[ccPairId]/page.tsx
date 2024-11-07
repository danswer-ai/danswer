"use client";

import { CCPairStatus } from "@/components/Status";
import { BackButton } from "@/components/BackButton";
import { Divider } from "@tremor/react";
import { ErrorCallout } from "@/components/ErrorCallout";
import { ValidSources } from "@/lib/types";
import useSWR, { mutate } from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ThreeDotsLoader } from "@/components/Loading";
import CredentialSection from "@/components/credentials/CredentialSection";
import { SourceIcon } from "@/components/SourceIcon";
import { credentialTemplates } from "@/lib/connectors/credentials";
import { useEffect, useRef, useState } from "react";
import { CheckmarkIcon, EditIcon, XIcon } from "@/components/icons/icons";
import { updateConnectorCredentialPairName } from "@/lib/connector";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CCPairFullInfo, ConnectorCredentialPairStatus } from "@/app/admin/connector/[ccPairId]/types";
import { buildCCPairInfoUrl } from "@/app/admin/connector/[ccPairId]/lib";
import { ReIndexButton } from "@/app/admin/connector/[ccPairId]/ReIndexButton";
import { ModifyStatusButtonCluster } from "@/app/admin/connector/[ccPairId]/ModifyStatusButtonCluster";
import DeletionErrorStatus from "@/app/admin/connector/[ccPairId]/DeletionErrorStatus";
import { AdvancedConfigDisplay, ConfigDisplay } from "@/app/admin/connector/[ccPairId]/ConfigDisplay";
import { IndexingAttemptsTable } from "@/app/admin/connector/[ccPairId]/IndexingAttemptsTable";
import { DeletionButton } from "@/app/admin/connector/[ccPairId]/DeletionButton";

// since the uploaded files are cleaned up after some period of time
// re-indexing will not work for the file connector. Also, it would not
// make sense to re-index, since the files will not have changed.
const CONNECTOR_TYPES_THAT_CANT_REINDEX: ValidSources[] = ["file"];

function Main({ ccPairId }: { ccPairId: number }) {
  const { teamspaceId } = useParams();
  const router = useRouter(); // Initialize the router
  const {
    data: ccPair,
    isLoading,
    error,
  } = useSWR<CCPairFullInfo>(
    buildCCPairInfoUrl(ccPairId),
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [editableName, setEditableName] = useState(ccPair?.name || "");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const finishConnectorDeletion = () => {
    toast({
      title: "Deletion Successful",
      description: "Connector deleted successfully",
      variant: "success",
    });
    setTimeout(() => {
      router.push(`/t/${teamspaceId}/admin/indexing/status`);
    }, 2000);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (ccPair && !error) {
      setHasLoadedOnce(true);
    }

    if (
      (hasLoadedOnce && (error || !ccPair)) ||
      (ccPair?.status === ConnectorCredentialPairStatus.DELETING &&
        !ccPair.connector)
    ) {
      finishConnectorDeletion();
    }
  }, [isLoading, ccPair, error, hasLoadedOnce]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableName(e.target.value);
  };

  const handleUpdateName = async () => {
    try {
      const response = await updateConnectorCredentialPairName(
        ccPair?.id!,
        editableName
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      mutate(buildCCPairInfoUrl(ccPairId));
      setIsEditing(false);
      toast({
        title: "Update Successful",
        description: "Connector name updated successfully",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update connector name",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <ThreeDotsLoader />;
  }

  if (!ccPair || (!hasLoadedOnce && error)) {
    return (
      <ErrorCallout
        errorTitle={`Failed to fetch info on Connector with ID ${ccPairId}`}
        errorMsg={error?.info?.detail || error?.toString() || "Unknown error"}
      />
    );
  }

  const isDeleting = ccPair.status === ConnectorCredentialPairStatus.DELETING;

  const refresh = () => {
    mutate(buildCCPairInfoUrl(ccPairId));
  };

  const startEditing = () => {
    setEditableName(ccPair.name);
    setIsEditing(true);
  };

  const resetEditing = () => {
    setIsEditing(false);
    setEditableName(ccPair.name);
  };

  const {
    prune_freq: pruneFreq,
    refresh_freq: refreshFreq,
    indexing_start: indexingStart,
  } = ccPair.connector;
  return (
    <>
      <BackButton />
      <div className="flex flex-col items-start w-full gap-2 pb-5 sm:flex-row lg:items-center">
        <div className="my-auto mr-2">
          <SourceIcon iconSize={24} sourceType={ccPair.connector.source} />
        </div>

        {ccPair.is_editable_for_current_user && isEditing ? (
          <div className="flex items-center">
            <Input
              ref={inputRef}
              type="text"
              value={editableName}
              onChange={handleNameChange}
            />
            <Button onClick={handleUpdateName} className="ml-2">
              <CheckmarkIcon className="text-neutral-200" />
            </Button>
            <Button
              onClick={() => resetEditing()}
              className="ml-2"
              variant="destructive"
            >
              <XIcon className="text-neutral-200" />
            </Button>
          </div>
        ) : (
          <h1
            onClick={() =>
              ccPair.is_editable_for_current_user && startEditing()
            }
            className={`group flex ${ccPair.is_editable_for_current_user ? "cursor-pointer" : ""} text-3xl text-emphasis gap-x-2 items-center font-bold`}
          >
            {ccPair.name}
            {ccPair.is_editable_for_current_user && (
              <EditIcon className="invisible group-hover:visible" />
            )}
          </h1>
        )}

        {ccPair.is_editable_for_current_user && (
          <div className="flex ml-auto gap-x-2">
            {!CONNECTOR_TYPES_THAT_CANT_REINDEX.includes(
              ccPair.connector.source
            ) && (
              <ReIndexButton
                ccPairId={ccPair.id}
                connectorId={ccPair.connector.id}
                credentialId={ccPair.credential.id}
                isDisabled={
                  ccPair.status === ConnectorCredentialPairStatus.PAUSED
                }
                isDeleting={isDeleting}
              />
            )}
            {!isDeleting && <ModifyStatusButtonCluster ccPair={ccPair} />}
          </div>
        )}
      </div>
      <CCPairStatus
        status={ccPair.last_index_attempt_status || "not_started"}
        disabled={ccPair.status === ConnectorCredentialPairStatus.PAUSED}
        isDeleting={isDeleting}
      />
      <div className="mt-1 text-sm">
        Total Documents Indexed:{" "}
        <b className="text-emphasis">{ccPair.num_docs_indexed}</b>
      </div>
      {!ccPair.is_editable_for_current_user && (
        <div className="mt-2 text-sm italic text-neutral-500">
          {ccPair.is_public
            ? "Public connectors are not editable by curators."
            : "This connector belongs to groups where you don't have curator permissions, so it's not editable."}
        </div>
      )}

      {ccPair.deletion_failure_message &&
        ccPair.status === ConnectorCredentialPairStatus.DELETING && (
          <>
            <div className="mt-6" />
            <DeletionErrorStatus
              deletion_failure_message={ccPair.deletion_failure_message}
            />
          </>
        )}

      {credentialTemplates[ccPair.connector.source] &&
        ccPair.is_editable_for_current_user && (
          <>
            <Divider />

            <h3 className="mb-2">Credentials</h3>

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

      {(pruneFreq || indexingStart || refreshFreq) && (
        <AdvancedConfigDisplay
          pruneFreq={pruneFreq}
          indexingStart={indexingStart}
          refreshFreq={refreshFreq}
        />
      )}

      {/* NOTE: no divider / title here for `ConfigDisplay` since it is optional and we need
        to render these conditionally.*/}
      <div className="mt-6">
        <div className="flex pb-2">
          <h3>Indexing Attempts</h3>
        </div>
        <IndexingAttemptsTable ccPair={ccPair} />
      </div>
      <Divider />
      <div className="flex mt-8">
        <div className="mx-auto">
          {ccPair.is_editable_for_current_user && (
            <DeletionButton ccPair={ccPair} teamspaceId={teamspaceId} />
          )}
        </div>
      </div>
    </>
  );
}

export default function Page({ params }: { params: { ccPairId: string } }) {
  const ccPairId = parseInt(params.ccPairId);

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="container">
        <Main ccPairId={ccPairId} />
      </div>
    </div>
  );
}
