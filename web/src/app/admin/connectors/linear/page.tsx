"use client";

import * as Yup from "yup";
import { LinearIcon, TrashIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import {
  Credential,
  ConnectorIndexingStatus,
  LinearCredentialJson,
} from "@/lib/types";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { usePopup } from "@/components/admin/connectors/Popup";
import { usePublicCredentials } from "@/lib/hooks";

const Main = () => {
  const { popup, setPopup } = usePopup();

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

  const linearConnectorIndexingStatuses: ConnectorIndexingStatus<
    {},
    LinearCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "linear"
  );
  const linearCredential: Credential<LinearCredentialJson> | undefined =
    credentialsData.find(
      (credential) => credential.credential_json?.linear_api_key
    );

  return (
    <>
      {popup}
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your Credentials
      </h2>

      {linearCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing API Key: </p>
            <p className="ml-1 italic my-auto max-w-md truncate">
              {linearCredential.credential_json?.linear_api_key}
            </p>
            <button
              className="ml-1 hover:bg-gray-700 rounded-full p-1"
              onClick={async () => {
                if (linearConnectorIndexingStatuses.length > 0) {
                  setPopup({
                    type: "error",
                    message:
                      "Must delete all connectors before deleting credentials",
                  });
                  return;
                }
                await adminDeleteCredential(linearCredential.id);
                refreshCredentials();
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">
            To use the Linear connector, first follow the guide{" "}
            <a
              className="text-blue-500"
              href="https://docs.danswer.dev/connectors/jira#setting-up"
            >
              here
            </a>{" "}
            to generate an API Key.
          </p>
          <div className="border-solid border-gray-600 border rounded-md p-6 mt-2">
            <CredentialForm<LinearCredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="linear_api_key"
                    label="Linear API Key:"
                    type="password"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                linear_api_key: Yup.string().required(
                  "Please enter your Linear API Key!"
                ),
              })}
              initialValues={{
                linear_api_key: "",
              }}
              onSubmit={(isSuccess) => {
                if (isSuccess) {
                  refreshCredentials();
                }
              }}
            />
          </div>
        </>
      )}

      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 2: Start indexing
      </h2>
      {linearCredential ? (
        <>
          {linearConnectorIndexingStatuses.length > 0 ? (
            <>
              <p className="text-sm mb-2">
                We pull the latest <i>issues</i> and <i>comments</i> every{" "}
                <b>10</b> minutes.
              </p>
              <div className="mb-2">
                <ConnectorsTable<{}, LinearCredentialJson>
                  connectorIndexingStatuses={linearConnectorIndexingStatuses}
                  liveCredential={linearCredential}
                  getCredential={(credential) => {
                    return (
                      <div>
                        <p>{credential.credential_json.linear_api_key}</p>
                      </div>
                    );
                  }}
                  onCredentialLink={async (connectorId) => {
                    if (linearCredential) {
                      await linkCredential(connectorId, linearCredential.id);
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
            <div className="border-solid border-gray-600 border rounded-md p-6 mt-4">
              <h2 className="font-bold mb-3">Create Connector</h2>
              <p className="text-sm mb-4">
                Press connect below to start the connection Linear. We pull the
                latest <i>issues</i> and <i>comments</i> every <b>10</b>{" "}
                minutes.
              </p>
              <ConnectorForm<{}>
                nameBuilder={() => "LinearConnector"}
                ccPairNameBuilder={() => "Linear"}
                source="linear"
                inputType="poll"
                formBody={<></>}
                validationSchema={Yup.object().shape({})}
                initialValues={{}}
                refreshFreq={10 * 60} // 10 minutes
                credentialId={linearCredential.id}
              />
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-sm">
            Please provide your access token in Step 1 first! Once done with
            that, you can then start indexing Linear.
          </p>
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
      <div className="border-solid border-gray-600 border-b mb-4 pb-2 flex">
        <LinearIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Linear</h1>
      </div>
      <Main />
    </div>
  );
}
