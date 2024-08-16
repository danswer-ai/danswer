"use client";

import { CCPairFullInfo, ConnectorCredentialPairStatus } from "./types";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CCPairStatus } from "@/components/Status";
import { BackButton } from "@/components/BackButton";
import { Button, Divider, Title } from "@tremor/react";
import { IndexingAttemptsTable } from "./IndexingAttemptsTable";
import { AdvancedConfigDisplay, ConfigDisplay } from "./ConfigDisplay";
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
import { buildIndexingErrorsUrl } from "./lib";
import { SourceIcon } from "@/components/SourceIcon";
import { credentialTemplates } from "@/lib/connectors/credentials";
import { useEffect, useRef, useState } from "react";
import { CheckmarkIcon, EditIcon, XIcon } from "@/components/icons/icons";
import { usePopup } from "@/components/admin/connectors/Popup";
import { updateConnectorCredentialPairName } from "@/lib/connector";
import { IndexAttemptError } from "./types";
import { IndexAttemptErrorsTable } from "./IndexAttemptErrorsTable";

// since the uploaded files are cleaned up after some period of time
// re-indexing will not work for the file connector. Also, it would not
// make sense to re-index, since the files will not have changed.
const CONNECTOR_TYPES_THAT_CANT_REINDEX: ValidSources[] = ["file"];

function Main({ id }: { id: number }) {
  const {
    data: indexAttemptErrors,
    isLoading,
    error,
  } = useSWR<IndexAttemptError[]>(
    buildIndexingErrorsUrl(id),
    errorHandlingFetcher
  );

  if (isLoading) {
    return <ThreeDotsLoader />;
  }

  if (error || !indexAttemptErrors) {
    return (
      <ErrorCallout
        errorTitle={`Failed to fetch errors for attempt ID ${id}`}
        errorMsg={error?.info?.detail || error.toString()}
      />
    );
  }

  return (
    <>
      <BackButton />
      <div className="mt-6">
        <div className="flex">
          <Title>Indexing Errors for Attempt {id}</Title>
        </div>
        <IndexAttemptErrorsTable indexAttemptErrors={indexAttemptErrors} />
      </div>
    </>
  );
}

export default function Page({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);

  return (
    <div className="mx-auto container">
      <Main id={id} />
    </div>
  );
}
