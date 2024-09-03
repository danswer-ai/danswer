"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { S3Icon, TrashIcon } from "@/components/icons/icons";
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
  S3Config,
  S3CredentialJson,
} from "@/lib/types";
import { Text, Title, Button } from "@tremor/react";
import useSWR, { useSWRConfig } from "swr";
import * as Yup from "yup";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";

const S3Main = () => {
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

  const s3ConnectorIndexingStatuses: ConnectorIndexingStatus<
    S3Config,
    S3CredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "s3"
  );

  const s3Credential: Credential<S3CredentialJson> | undefined =
    credentialsData.find(
      (credential) => credential.credential_json?.aws_access_key_id
    );

  return (
    <>
      <Title className="mt-6 mb-2 ml-auto mr-auto">
        Step 1: Provide your access info
      </Title>
      {s3Credential ? (
        <>
          {" "}
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing AWS Access Key ID: </p>
            <p className="my-auto ml-1 italic">
              {s3Credential.credential_json.aws_access_key_id}
            </p>
            <Button
              className="p-1 ml-1 rounded hover:bg-hover"
              onClick={async () => {
                if (s3ConnectorIndexingStatuses.length > 0) {
                  toast({
                    title: "Error",
                    description:
                      "Must delete all connectors before deleting credentials",
                    variant: "destructive",
                  });
                  return;
                }
                await adminDeleteCredential(s3Credential.id);
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
                If AWS Access Key ID and AWS Secret Access Key are provided,
                they will be used for authenticating the connector.
              </li>
              <li>Otherwise, the Profile Name will be used (if provided).</li>
              <li>
                If no credentials are provided, then the connector will try to
                authenticate with any default AWS credentials available.
              </li>
            </ul>
          </Text>
          <Card className="mt-4">
            <CardContent>
              <CredentialForm<S3CredentialJson>
                formBody={
                  <>
                    <TextFormField
                      name="aws_access_key_id"
                      label="AWS Access Key ID:"
                    />
                    <TextFormField
                      name="aws_secret_access_key"
                      label="AWS Secret Access Key:"
                    />
                  </>
                }
                validationSchema={Yup.object().shape({
                  aws_access_key_id: Yup.string().default(""),
                  aws_secret_access_key: Yup.string().default(""),
                })}
                initialValues={{
                  aws_access_key_id: "",
                  aws_secret_access_key: "",
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
        Step 2: Which S3 bucket do you want to make searchable?
      </Title>

      {s3ConnectorIndexingStatuses.length > 0 && (
        <>
          <Title className="mt-6 mb-2 ml-auto mr-auto">
            S3 indexing status
          </Title>
          <Text className="mb-2">
            The latest changes are fetched every 10 minutes.
          </Text>
          <div className="mb-2">
            <ConnectorsTable<S3Config, S3CredentialJson>
              includeName={true}
              connectorIndexingStatuses={s3ConnectorIndexingStatuses}
              liveCredential={s3Credential}
              getCredential={(credential) => {
                return <div></div>;
              }}
              onCredentialLink={async (connectorId) => {
                if (s3Credential) {
                  await linkCredential(connectorId, s3Credential.id);
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

      {s3Credential && (
        <>
          <Card className="mt-4">
            <CardContent>
              <h2 className="mb-3 font-bold">Create Connection</h2>
              <Text className="mb-4">
                Press connect below to start the connection to your S3 bucket.
              </Text>
              <ConnectorForm<S3Config>
                nameBuilder={(values) => `S3Connector-${values.bucket_name}`}
                ccPairNameBuilder={(values) =>
                  `S3Connector-${values.bucket_name}`
                }
                source="s3"
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
                    .oneOf(["s3"])
                    .required("Bucket type must be s3"),
                  bucket_name: Yup.string().required(
                    "Please enter the name of the s3 bucket to index, e.g. my-test-bucket"
                  ),
                  prefix: Yup.string().default(""),
                })}
                initialValues={{
                  bucket_type: "s3",
                  bucket_name: "",
                  prefix: "",
                }}
                refreshFreq={60 * 60 * 24} // 1 day
                credentialId={s3Credential.id}
              />
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
};

export default function Page() {
  const [selectedStorage, setSelectedStorage] = useState<string>("s3");

  return (
    <div className="container mx-auto py-24 md:py-32 lg:pt-16">
      <div>
        <HealthCheckBanner />
      </div>
      <BackButton />

      <AdminPageTitle icon={<S3Icon size={32} />} title="S3 Storage" />

      <S3Main key={1} />
    </div>
  );
}
