"use client";

import * as Yup from "yup";
import { GmailIcon } from "@/components/icons/icons";
import useSWR, { useSWRConfig } from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ErrorCallout } from "@/components/ErrorCallout";
import { LoadingAnimation } from "@/components/Loading";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  ConnectorIndexingStatus,
  Credential,
  GmailCredentialJson,
  GmailServiceAccountCredentialJson,
  GmailConfig,
} from "@/lib/types";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { GmailConnectorsTable } from "./GmailConnectorsTable";
import { gmailConnectorNameBuilder } from "./utils";
import { GmailOAuthSection, GmailJsonUploadSection } from "./Credential";
import { usePublicCredentials } from "@/lib/hooks";
import { AdminPageTitle } from "@/components/admin/Title";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";

interface GmailConnectorManagementProps {
  gmailPublicCredential?: Credential<GmailCredentialJson>;
  gmailServiceAccountCredential?: Credential<GmailServiceAccountCredentialJson>;
  gmailConnectorIndexingStatus: ConnectorIndexingStatus<
    GmailConfig,
    GmailCredentialJson
  > | null;
  gmailConnectorIndexingStatuses: ConnectorIndexingStatus<
    GmailConfig,
    GmailCredentialJson
  >[];
  credentialIsLinked: boolean;
}

const GmailConnectorManagement = ({
  gmailPublicCredential: gmailPublicCredential,
  gmailServiceAccountCredential: gmailServiceAccountCredential,
  gmailConnectorIndexingStatuses: gmailConnectorIndexingStatuses,
}: GmailConnectorManagementProps) => {
  const { mutate } = useSWRConfig();

  const liveCredential = gmailPublicCredential || gmailServiceAccountCredential;
  if (!liveCredential) {
    return (
      <p className="text-sm">
        Please authenticate with Gmail as described in Step 2! Once done with
        that, you can then move on to enable this connector.
      </p>
    );
  }

  return (
    <div>
      <p>
        <div className="my-3">
          {gmailConnectorIndexingStatuses.length > 0 ? (
            <>
              Checkout the{" "}
              <a href="/admin/indexing/status" className="text-blue-500">
                status page
              </a>{" "}
              for the latest indexing status. We fetch the latest mails from
              Gmail every <b>10</b> minutes.
            </>
          ) : (
            <p className="text-sm mb-2">
              Fill out the form below to create a connector. We will refresh the
              latest documents from Gmail every <b>10</b> minutes.
            </p>
          )}
        </div>
      </p>
      {gmailConnectorIndexingStatuses.length > 0 && (
        <>
          <div className="text-sm mb-2 font-bold">Existing Connectors:</div>
          <GmailConnectorsTable
            gmailConnectorIndexingStatuses={gmailConnectorIndexingStatuses}
          />
        </>
      )}

      {gmailConnectorIndexingStatuses.length > 0 && (
        <h2 className="font-bold mt-3 text-sm">Add New Connector:</h2>
      )}
      <Card className="mt-4">
        <CardContent>
          <ConnectorForm<GmailConfig>
            nameBuilder={gmailConnectorNameBuilder}
            source="gmail"
            inputType="poll"
            formBody={null}
            validationSchema={Yup.object().shape({})}
            initialValues={{}}
            refreshFreq={10 * 60} // 10 minutes
            credentialId={liveCredential.id}
          />
        </CardContent>
      </Card>
    </div>
  );
};

const Main = () => {
  const {
    data: appCredentialData,
    isLoading: isAppCredentialLoading,
    error: isAppCredentialError,
  } = useSWR<{ client_id: string }>(
    "/api/manage/admin/connector/gmail/app-credential",
    errorHandlingFetcher
  );
  const {
    data: serviceAccountKeyData,
    isLoading: isServiceAccountKeyLoading,
    error: isServiceAccountKeyError,
  } = useSWR<{ service_account_email: string }>(
    "/api/manage/admin/connector/gmail/service-account-key",
    errorHandlingFetcher
  );
  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: connectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    errorHandlingFetcher
  );
  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    error: credentialsError,
    refreshCredentials,
  } = usePublicCredentials();

  const { toast } = useToast();

  const appCredentialSuccessfullyFetched =
    appCredentialData ||
    (isAppCredentialError && isAppCredentialError.status === 404);
  const serviceAccountKeySuccessfullyFetched =
    serviceAccountKeyData ||
    (isServiceAccountKeyError && isServiceAccountKeyError.status === 404);

  if (
    (!appCredentialSuccessfullyFetched && isAppCredentialLoading) ||
    (!serviceAccountKeySuccessfullyFetched && isServiceAccountKeyLoading) ||
    (!connectorIndexingStatuses && isConnectorIndexingStatusesLoading) ||
    (!credentialsData && isCredentialsLoading)
  ) {
    return (
      <div className="mx-auto">
        <LoadingAnimation text="" />
      </div>
    );
  }

  if (credentialsError || !credentialsData) {
    return (
      <div className="mx-auto">
        <div className="text-red-500">Failed to load credentials.</div>
      </div>
    );
  }

  if (connectorIndexingStatusesError || !connectorIndexingStatuses) {
    return (
      <div className="mx-auto">
        <div className="text-red-500">Failed to load connectors.</div>
      </div>
    );
  }

  if (
    !appCredentialSuccessfullyFetched ||
    !serviceAccountKeySuccessfullyFetched
  ) {
    return (
      <div className="mx-auto">
        <div className="text-red-500">
          Error loading Gmail app credentials. Contact an administrator.
        </div>
      </div>
    );
  }

  const gmailPublicCredential: Credential<GmailCredentialJson> | undefined =
    credentialsData.find(
      (credential) =>
        credential.credential_json?.gmail_tokens && credential.admin_public
    );
  const gmailServiceAccountCredential:
    | Credential<GmailServiceAccountCredentialJson>
    | undefined = credentialsData.find(
    (credential) => credential.credential_json?.gmail_service_account_key
  );
  const gmailConnectorIndexingStatuses: ConnectorIndexingStatus<
    GmailConfig,
    GmailCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "gmail"
  );
  const gmailConnectorIndexingStatus = gmailConnectorIndexingStatuses[0];

  const credentialIsLinked =
    (gmailConnectorIndexingStatus !== undefined &&
      gmailPublicCredential !== undefined &&
      gmailConnectorIndexingStatus.connector.credential_ids.includes(
        gmailPublicCredential.id
      )) ||
    (gmailConnectorIndexingStatus !== undefined &&
      gmailServiceAccountCredential !== undefined &&
      gmailConnectorIndexingStatus.connector.credential_ids.includes(
        gmailServiceAccountCredential.id
      ));

  return (
    <>
      <h3 className="mb-2 ml-auto mr-auto">Step 1: Provide your Credentials</h3>
      <GmailJsonUploadSection
        appCredentialData={appCredentialData}
        serviceAccountCredentialData={serviceAccountKeyData}
      />

      <h3 className="mb-2 mt-6 ml-auto mr-auto">
        Step 2: Authenticate with enMedD AI
      </h3>
      <GmailOAuthSection
        refreshCredentials={refreshCredentials}
        gmailPublicCredential={gmailPublicCredential}
        gmailServiceAccountCredential={gmailServiceAccountCredential}
        appCredentialData={appCredentialData}
        serviceAccountKeyData={serviceAccountKeyData}
        connectorExists={gmailConnectorIndexingStatuses.length > 0}
      />

      <h3 className="mb-2 mt-6 ml-auto mr-auto">Step 3: Start Indexing!</h3>
      <GmailConnectorManagement
        gmailPublicCredential={gmailPublicCredential}
        gmailServiceAccountCredential={gmailServiceAccountCredential}
        gmailConnectorIndexingStatus={gmailConnectorIndexingStatus}
        gmailConnectorIndexingStatuses={gmailConnectorIndexingStatuses}
        credentialIsLinked={credentialIsLinked}
      />
    </>
  );
};

export default function Page() {
  return (
    <div className="py-24 md:py-32 lg:pt-16">
      <BackButton />

      <AdminPageTitle icon={<GmailIcon size={32} />} title="Gmail" />

      <Main />
    </div>
  );
}
