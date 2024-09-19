"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { GoogleStorageIcon, TrashIcon } from "@/components/icons/icons";
import { LoadingAnimation } from "@/components/Loading";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import { TextFormField } from "@/components/admin/connectors/Field";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ErrorCallout } from "@/components/ErrorCallout";
import { usePublicCredentials } from "@/lib/hooks";
import { ConnectorIndexingStatus, Credential } from "@/lib/types";

import { GCSConfig, GCSCredentialJson } from "@/lib/types";

import { Text, Title, Button } from "@tremor/react";
import useSWR, { useSWRConfig } from "swr";
import * as Yup from "yup";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";

const GCSMain = () => {
  const { toast } = useToast();
  const { mutate } = useSWRConfig();
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

  if (
    (!connectorIndexingStatuses && isConnectorIndexingStatusesLoading) ||
    (!credentialsData && isCredentialsLoading)
  ) {
    return <LoadingAnimation text="Loading" />;
  }

  if (connectorIndexingStatusesError || !connectorIndexingStatuses) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={connectorIndexingStatusesError?.info?.detail}
      />
    );
  }

  if (credentialsError || !credentialsData) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={credentialsError?.info?.detail}
      />
    );
  }

  const gcsConnectorIndexingStatuses: ConnectorIndexingStatus<
    GCSConfig,
    GCSCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "google_cloud_storage"
  );

  const gcsCredential: Credential<GCSCredentialJson> | undefined =
    credentialsData.find(
      (credential) => credential.credential_json?.project_id
    );

  return (
    <>
      <h3 className="mt-6 mb-2 ml-auto mr-auto">
        Step 1: Provide your GCS access info
      </h3>
      {gcsCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing GCS Access Key ID: </p>
            <p className="my-auto ml-1 italic">
              {gcsCredential.credential_json.access_key_id}
            </p>
            {", "}
            <p className="my-auto ml-1">Secret Access Key: </p>
            <p className="my-auto ml-1 italic">
              {gcsCredential.credential_json.secret_access_key}
            </p>{" "}
            <Button
              className="p-1 ml-1 rounded hover:bg-hover"
              onClick={async () => {
                if (gcsConnectorIndexingStatuses.length > 0) {
                  toast({
                    title: "Error",
                    description:
                      "Must delete all connectors before deleting credentials",
                    variant: "destructive",
                  });
                  return;
                }
                await adminDeleteCredential(gcsCredential.id);
                refreshCredentials();
              }}
              variant="light"
            >
              <TrashIcon />
            </Button>
          </div>
        </>
      ) : (
        <>
          <ul className="mt-2 ml-4 list-disc text-sm">
            <li>
              Provide your GCS Project ID, Client Email, and Private Key for
              authentication.
            </li>
            <li>These credentials will be used to access your GCS buckets.</li>
          </ul>
          <Card className="mt-4">
            <CardContent>
              <CredentialForm<GCSCredentialJson>
                formBody={
                  <>
                    <TextFormField name="project_id" label="GCS Project ID:" />
                    <TextFormField
                      name="access_key_id"
                      label="Access Key ID:"
                    />
                    <TextFormField
                      name="secret_access_key"
                      label="Secret Access Key:"
                    />
                  </>
                }
                validationSchema={Yup.object().shape({
                  secret_access_key: Yup.string().required(
                    "Client Email is required"
                  ),
                  access_key_id: Yup.string().required(
                    "Private Key is required"
                  ),
                })}
                initialValues={{
                  secret_access_key: "",
                  access_key_id: "",
                }}
                onSubmit={(isSuccess) => {
                  if (isSuccess) {
                    refreshCredentials();
                  }
                }}
              />
            </CardContent>
          </Card>
        </>
      )}

      <h3 className="mt-6 mb-2 ml-auto mr-auto">
        Step 2: Which GCS bucket do you want to make searchable?
      </h3>

      {gcsConnectorIndexingStatuses.length > 0 && (
        <>
          <h3 className="mt-6 mb-2 ml-auto mr-auto">GCS indexing status</h3>
          <Text className="mb-2">
            The latest changes are fetched every 10 minutes.
          </Text>
          <div className="mb-2">
            <ConnectorsTable<GCSConfig, GCSCredentialJson>
              includeName={true}
              connectorIndexingStatuses={gcsConnectorIndexingStatuses}
              liveCredential={gcsCredential}
              getCredential={(credential) => {
                return <div></div>;
              }}
              onCredentialLink={async (connectorId) => {
                if (gcsCredential) {
                  await linkCredential(connectorId, gcsCredential.id);
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
            />
          </div>
        </>
      )}

      {gcsCredential && (
        <>
          <Card className="mt-4">
            <CardContent>
              <h2 className="mb-3 font-bold">Create Connection</h2>
              <Text className="mb-4">
                Press connect below to start the connection to your GCS bucket.
              </Text>
              <ConnectorForm<GCSConfig>
                nameBuilder={(values) => `GCSConnector-${values.bucket_name}`}
                ccPairNameBuilder={(values) =>
                  `GCSConnector-${values.bucket_name}`
                }
                source="google_cloud_storage"
                inputType="poll"
                formBodyBuilder={(values) => (
                  <div>
                    <TextFormField name="bucket_name" label="Bucket Name:" />
                    <TextFormField
                      name="prefix"
                      label="Path Prefix (optional):"
                    />
                  </div>
                )}
                validationSchema={Yup.object().shape({
                  bucket_type: Yup.string()
                    .oneOf(["google_cloud_storage"])
                    .required("Bucket type must be google_cloud_storage"),
                  bucket_name: Yup.string().required(
                    "Please enter the name of the GCS bucket to index, e.g. my-gcs-bucket"
                  ),
                  prefix: Yup.string().default(""),
                })}
                initialValues={{
                  bucket_type: "google_cloud_storage",
                  bucket_name: "",
                  prefix: "",
                }}
                refreshFreq={60 * 60 * 24} // 1 day
                credentialId={gcsCredential.id}
              />
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
};

export default function Page() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <BackButton />
        <AdminPageTitle
          icon={<GoogleStorageIcon size={32} />}
          title="Google Cloud Storage"
        />
        <GCSMain />
      </div>
    </div>
  );
}
