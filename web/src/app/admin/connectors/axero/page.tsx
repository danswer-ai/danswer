"use client";

import * as Yup from "yup";
import { AxeroIcon, LinearIcon, TrashIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import {
  Credential,
  ConnectorIndexingStatus,
  LinearCredentialJson,
  AxeroCredentialJson,
} from "@/lib/types";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { usePopup } from "@/components/admin/connectors/Popup";
import { usePublicCredentials } from "@/lib/hooks";
import { Card, Text, Title } from "@tremor/react";
import { AdminPageTitle } from "@/components/admin/Title";

const Main = () => {
  const { popup, setPopup } = usePopup();

  const { mutate } = useSWRConfig();
  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: isConnectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    fetcher,
    { refreshInterval: 5000 } // 5 seconds
  );
  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    error: isCredentialsError,
    isValidating: isCredentialsValidating,
    refreshCredentials,
  } = usePublicCredentials();

  if (
    isConnectorIndexingStatusesLoading ||
    isCredentialsLoading ||
    isCredentialsValidating
  ) {
    return <LoadingAnimation text="Loading" />;
  }

  if (isConnectorIndexingStatusesError || !connectorIndexingStatuses) {
    return <div>Failed to load connectors</div>;
  }

  if (isCredentialsError || !credentialsData) {
    return <div>Failed to load credentials</div>;
  }

  const axeroConnectorIndexingStatuses: ConnectorIndexingStatus<
    {},
    AxeroCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "axero"
  );
  const axeroCredential: Credential<AxeroCredentialJson> | undefined =
    credentialsData.find(
      (credential) => credential.credential_json?.axero_api_token
    );

  return (
    <>
      {popup}
      <Title className="mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your Credentials
      </Title>

      {axeroCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <Text className="my-auto">Existing API Key: </Text>
            <Text className="ml-1 italic my-auto max-w-md truncate">
              {axeroCredential.credential_json?.axero_api_token}
            </Text>
            <button
              className="ml-1 hover:bg-hover rounded p-1"
              onClick={async () => {
                if (axeroConnectorIndexingStatuses.length > 0) {
                  setPopup({
                    type: "error",
                    message:
                      "Must delete all connectors before deleting credentials",
                  });
                  return;
                }
                await adminDeleteCredential(axeroCredential.id);
                refreshCredentials();
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <Text>
            To use the Axero connector, first follow the guide{" "}
            <a
              className="text-blue-500"
              href="https://docs.danswer.dev/connectors/axero"
              target="_blank"
            >
              here
            </a>{" "}
            to generate an API Key.
          </Text>
          <Card className="mt-4">
            <CredentialForm<AxeroCredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="axero_api_token"
                    label="Axero API Key:"
                    type="password"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                axero_api_token: Yup.string().required(
                  "Please enter your Axero API Key!"
                ),
              })}
              initialValues={{
                axero_api_token: "",
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
        Step 2: Start indexing
      </Title>
      {axeroCredential ? (
        <>
          {axeroConnectorIndexingStatuses.length > 0 ? (
            <>
              <Text className="mb-2">
                We pull the latest <i>Articles</i>, <i>Blogs</i>, and{" "}
                <i>Wikis</i> every <b>10</b> minutes.
              </Text>
              <div className="mb-2">
                <ConnectorsTable<{}, AxeroCredentialJson>
                  connectorIndexingStatuses={axeroConnectorIndexingStatuses}
                  liveCredential={axeroCredential}
                  getCredential={(credential) => {
                    return (
                      <div>
                        <p>{credential.credential_json.axero_api_token}</p>
                      </div>
                    );
                  }}
                  onCredentialLink={async (connectorId) => {
                    if (axeroCredential) {
                      await linkCredential(connectorId, axeroCredential.id);
                      mutate("/api/manage/admin/connector/indexing-status");
                    }
                  }}
                  onUpdate={() =>
                    mutate("/api/manage/admin/connector/indexing-status")
                  }
                />
              </div>
            </>
          ) : (
            <Card className="mt-4">
              <h2 className="font-bold mb-3">Create Connector</h2>
              <p className="text-sm mb-4">
                Press connect below to start the connection Axero. We pull the
                latest <i>Articles</i>, <i>Blogs</i>, and <i>Wikis</i> every{" "}
                <b>10</b> minutes.
              </p>
              <ConnectorForm<{}>
                nameBuilder={() => "AxeroConnector"}
                ccPairNameBuilder={() => "Axero"}
                source="axero"
                inputType="poll"
                formBody={
                  <>
                    <TextFormField
                      name="base_url"
                      label="Axero Base URL"
                      subtext="The base URL you use to visit Axero."
                      placeholder="E.g. https://my-company.axero.com"
                    />
                  </>
                }
                validationSchema={Yup.object().shape({})}
                initialValues={{
                  base_url: "",
                }}
                refreshFreq={10 * 60} // 10 minutes
                credentialId={axeroCredential.id}
              />
            </Card>
          )}
        </>
      ) : (
        <>
          <Text>
            Please provide your access token in Step 1 first! Once done with
            that, you can then start indexing Linear.
          </Text>
        </>
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

      <AdminPageTitle icon={<AxeroIcon size={32} />} title="Axero" />

      <Main />
    </div>
  );
}
