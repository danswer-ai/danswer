"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { OCIStorageIcon, TrashIcon } from "@/components/icons/icons";
import { LoadingAnimation } from "@/components/Loading";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import { TextFormField } from "@/components/admin/connectors/Field";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ErrorCallout } from "@/components/ErrorCallout";
import { usePublicCredentials } from "@/lib/hooks";

import {
  ConnectorIndexingStatus,
  Credential,
  OCIConfig,
  OCICredentialJson,
} from "@/lib/types";
import { Select, SelectItem, Text, Title, Button } from "@tremor/react";
import useSWR, { useSWRConfig } from "swr";
import * as Yup from "yup";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";

const OCIMain = () => {
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

  const ociConnectorIndexingStatuses: ConnectorIndexingStatus<
    OCIConfig,
    OCICredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "oci_storage"
  );

  const ociCredential: Credential<OCICredentialJson> | undefined =
    credentialsData.find((credential) => credential.credential_json?.namespace);

  return (
    <>
      <Title className="mt-6 mb-2 ml-auto mr-auto">
        Step 1: Provide your access info
      </Title>
      {ociCredential ? (
        <>
          {" "}
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing OCI Access Key ID: </p>
            <p className="my-auto ml-1 italic">
              {ociCredential.credential_json.access_key_id}
            </p>
            {", "}
            <p className="my-auto ml-1">Namespace: </p>
            <p className="my-auto ml-1 italic">
              {ociCredential.credential_json.namespace}
            </p>{" "}
            <Button
              className="p-1 ml-1 rounded hover:bg-hover"
              onClick={async () => {
                if (ociConnectorIndexingStatuses.length > 0) {
                  toast({
                    title: "Error",
                    description:
                      "Must delete all connectors before deleting credentials",
                    variant: "destructive",
                  });
                  return;
                }
                await adminDeleteCredential(ociCredential.id);
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
          <Text>
            <ul className="mt-2 ml-4 list-disc">
              <li>
                Provide your OCI Access Key ID, Secret Access Key, Namespace,
                and Region for authentication.
              </li>
              <li>
                These credentials will be used to access your OCI buckets.
              </li>
            </ul>
          </Text>
          <Card className="mt-4">
            <CardContent>
              <CredentialForm<OCICredentialJson>
                formBody={
                  <>
                    <TextFormField
                      name="access_key_id"
                      label="OCI Access Key ID:"
                    />
                    <TextFormField
                      name="secret_access_key"
                      label="OCI Secret Access Key:"
                    />
                    <TextFormField name="namespace" label="Namespace:" />
                    <TextFormField name="region" label="Region:" />
                  </>
                }
                validationSchema={Yup.object().shape({
                  access_key_id: Yup.string().required(
                    "OCI Access Key ID is required"
                  ),
                  secret_access_key: Yup.string().required(
                    "OCI Secret Access Key is required"
                  ),
                  namespace: Yup.string().required("Namespace is required"),
                  region: Yup.string().required("Region is required"),
                })}
                initialValues={{
                  access_key_id: "",
                  secret_access_key: "",
                  namespace: "",
                  region: "",
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

      <Title className="mt-6 mb-2 ml-auto mr-auto">
        Step 2: Which OCI bucket do you want to make searchable?
      </Title>

      {ociConnectorIndexingStatuses.length > 0 && (
        <>
          <Title className="mt-6 mb-2 ml-auto mr-auto">
            OCI indexing status
          </Title>
          <Text className="mb-2">
            The latest changes are fetched every 10 minutes.
          </Text>
          <div className="mb-2">
            <ConnectorsTable<OCIConfig, OCICredentialJson>
              includeName={true}
              connectorIndexingStatuses={ociConnectorIndexingStatuses}
              liveCredential={ociCredential}
              getCredential={(credential) => {
                return <div></div>;
              }}
              onCredentialLink={async (connectorId) => {
                if (ociCredential) {
                  await linkCredential(connectorId, ociCredential.id);
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

      {ociCredential && (
        <>
          <Card className="mt-4">
            <CardContent>
              <h2 className="mb-3 font-bold">Create Connection</h2>
              <Text className="mb-4">
                Press connect below to start the connection to your OCI bucket.
              </Text>
              <ConnectorForm<OCIConfig>
                nameBuilder={(values) => `OCIConnector-${values.bucket_name}`}
                ccPairNameBuilder={(values) =>
                  `OCIConnector-${values.bucket_name}`
                }
                source="oci_storage"
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
                    .oneOf(["oci_storage"])
                    .required("Bucket type must be oci_storage"),
                  bucket_name: Yup.string().required(
                    "Please enter the name of the OCI bucket to index, e.g. my-test-bucket"
                  ),
                  prefix: Yup.string().default(""),
                })}
                initialValues={{
                  bucket_type: "oci_storage",
                  bucket_name: "",
                  prefix: "",
                }}
                refreshFreq={60 * 60 * 24} // 1 day
                credentialId={ociCredential.id}
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
    <div className="py-24 md:py-32 lg:pt-16">
      <BackButton />
      <AdminPageTitle
        icon={<OCIStorageIcon size={32} />}
        title="Oracle Cloud Infrastructure"
      />
      <OCIMain />
    </div>
  );
}
