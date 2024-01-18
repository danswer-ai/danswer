"use client";

import * as Yup from "yup";
import { TrashIcon, SharepointIcon } from "@/components/icons/icons"; // Make sure you have a Document360 icon
import { fetcher } from "@/lib/fetcher";
import useSWR, { useSWRConfig } from "swr";
import { LoadingAnimation } from "@/components/Loading";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  SharepointConfig,
  SharepointCredentialJson,
  ConnectorIndexingStatus,
  Credential,
} from "@/lib/types"; // Modify or create these types as required
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import {
  TextFormField,
  TextArrayFieldBuilder,
} from "@/components/admin/connectors/Field";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { usePublicCredentials } from "@/lib/hooks";
import { AdminPageTitle } from "@/components/admin/Title";
import { Card, Text, Title } from "@tremor/react";

const MainSection = () => {
  const { mutate } = useSWRConfig();
  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: isConnectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    fetcher
  );

  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    error: isCredentialsError,
    refreshCredentials,
  } = usePublicCredentials();

  if (
    (!connectorIndexingStatuses && isConnectorIndexingStatusesLoading) ||
    (!credentialsData && isCredentialsLoading)
  ) {
    return <LoadingAnimation text="Loading" />;
  }

  if (isConnectorIndexingStatusesError || !connectorIndexingStatuses) {
    return <div>Failed to load connectors</div>;
  }

  if (isCredentialsError || !credentialsData) {
    return <div>Failed to load credentials</div>;
  }

  const sharepointConnectorIndexingStatuses: ConnectorIndexingStatus<
    SharepointConfig,
    SharepointCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "sharepoint"
  );

  const sharepointCredential:
    | Credential<SharepointCredentialJson>
    | undefined = credentialsData.find(
    (credential) => credential.credential_json?.aad_client_id
  );

  return (
    <>
      <Title className="mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide Sharepoint credentials
      </Title>
      {sharepointCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <Text className="my-auto">Existing Azure AD Client ID: </Text>
            <Text className="ml-1 italic my-auto">
              {sharepointCredential.credential_json.aad_client_id}
            </Text>
            <button
              className="ml-1 hover:bg-hover rounded p-1"
              onClick={async () => {
                await adminDeleteCredential(sharepointCredential.id);
                refreshCredentials();
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <Text className="mb-2">
            To index Sharepoint, please provide
            Azure AD client ID, Client Secret, and Directory ID.
          </Text>
          <Card className="mt-2">
            <CredentialForm<SharepointCredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="aad_client_id"
                    label="Azure AD Client ID:"
                  />
                  <TextFormField
                    name="aad_client_secret"
                    label="Azure AD Client Secret:"
                    type="password"
                  />
                  <TextFormField
                    name="aad_directory_id"
                    label="Azure AD Directory ID:"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                aad_client_id: Yup.string().required(
                  "Please enter your Azure AD Client ID"
                ),
                aad_client_secret: Yup.string().required(
                  "Please enter your Azure AD Client Secret"
                ),
                aad_directory_id: Yup.string()
                  .required(
                    "Please enter your Azure AD Directory ID"
                  ),
              })}
              initialValues={{
                aad_client_id: "",
                aad_client_secret: "",
                aad_directory_id: "",
              }}
              onSubmit={(isSuccess) => {
                if (isSuccess) {
                  refreshCredentials();
                }
              }}
            />
          </Card>
        </>
      )}

      <Title className="mb-2 mt-6 ml-auto mr-auto">
        Step 2: Manage Sharepoint Connector
      </Title>

      {sharepointConnectorIndexingStatuses.length > 0 && (
        <>
          <Text className="mb-2">
            We index the most recently updated tickets from each Sharepoint
            instance listed below regularly.
          </Text>
          <Text className="mb-2">
            The initial poll at this time retrieves tickets updated in the past
            hour. All subsequent polls execute every ten minutes. This should be
            configurable in the future.
          </Text>
          <div className="mb-2">
            <ConnectorsTable<SharepointConfig, SharepointCredentialJson>
              connectorIndexingStatuses={
                sharepointConnectorIndexingStatuses
              }
              liveCredential={sharepointCredential}
              getCredential={(credential) =>
                credential.credential_json.aad_directory_id
              }
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
              onCredentialLink={async (connectorId) => {
                if (sharepointCredential) {
                  await linkCredential(
                    connectorId,
                    sharepointCredential.id
                  );
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
            />
          </div>
        </>
      )}

      {sharepointCredential &&
      sharepointConnectorIndexingStatuses.length === 0 ? (
        <Card className="mt-4">
          <ConnectorForm<SharepointConfig>
            nameBuilder={(values) =>
              `Sharepoint-${sharepointCredential.credential_json.aad_directory_id}`
            }
            ccPairNameBuilder={(values) =>
              `Sharepoint ${sharepointCredential.credential_json.aad_directory_id}`
            }
            source="sharepoint"
            inputType="poll"
            formBodyBuilder={TextArrayFieldBuilder({
              name: "sites",
              label: "Sites:",
              subtext:
                "Specify 0 or more sites to index. For example, specifying the site " +
                "'support' for the 'danswerai' sharepoint will cause us to only index all content " +
                "within the 'https://danswerai.sharepoint.com/sites/support' site. " +
                "If no sites are specified, all sites in your organization will be indexed.",
            })}
            validationSchema={Yup.object().shape({
              sites: Yup.array()
                .of(Yup.string().required("Site names must be strings"))
                .required(),
            })}
            formBody={<></>}
            initialValues={{
              sites: []
            }}
            credentialId={sharepointCredential.id}
            refreshFreq={10 * 60} // 10 minutes
          />
        </Card>
      ) : (
        <Text>
          Please provide all Azure info in Step 1 first! Once you're done with
          that, you can then specify which Sharepoint sites you want to make
          searchable.
        </Text>
      )}
    </>
  );
};

export default function Page() {
  return (
    <div className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>

      <AdminPageTitle
        icon={<SharepointIcon size={32} />}
        title="Sharepoint"
      />

      <MainSection />
    </div>
  );
}
