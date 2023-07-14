"use client";

import * as Yup from "yup";
import { AlationIcon, TrashIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import {
  AlationCredentialJson,
  AlationConfig,
  Credential,
  ConnectorIndexingStatus,
} from "@/lib/types";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { deleteCredential, linkCredential } from "@/lib/credential";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { usePopup } from "@/components/admin/connectors/Popup";

const Main = () => {
  const { popup, setPopup } = usePopup();

  const { mutate } = useSWRConfig();
  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: isConnectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any>[]>(
    "/api/manage/admin/connector/indexing-status",
    fetcher,
  );
  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    error: isCredentialsError,
  } = useSWR<Credential<AlationCredentialJson>[]>(
    "/api/manage/credential",
    fetcher,
  );

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

  const alationConnectorIndexingStatuses = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "alation",
  );
  const alationCredential = credentialsData.filter(
    (credential) => credential.credential_json?.alation_refresh_token,
  )[0];

  return (
    <>
      {popup}
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Indexing an Alation Server
      </h2>
      <p>This connector allows for indexing objects from an Alation server.</p>
      <p className="mb-4">
        Today we support indexing these specific object types:
      </p>
      <ul className="list-disc ml-8 mb-4">
        <li>Articles</li>
        <li>Tables</li>
        <li>Schemas</li>
        <li>Columns</li>
      </ul>
      <p>
        By default the connector extracts everything. You can limit the number
        of objects extracted by setting the "Maximum objects to index per Object
        Type" value below.
      </p>

      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your Alation Refresh Token
      </h2>

      {alationCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing Refresh Token: </p>
            <p className="ml-1 italic my-auto max-w-md truncate">
              {alationCredential.credential_json?.alation_refresh_token}
            </p>
            <button
              className="ml-1 hover:bg-gray-700 rounded-full p-1"
              onClick={async () => {
                if (alationConnectorIndexingStatuses.length > 0) {
                  setPopup({
                    type: "error",
                    message:
                      "Must delete all connectors before deleting credentials",
                  });
                  return;
                }
                await deleteCredential(alationCredential.id);
                mutate("/api/manage/credential");
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">
            To use the Alation connector, first follow the guide{" "}
            <a
              className="text-blue-500"
              href="https://docs.danswer.dev/connectors/alation#setting-up"
            >
              here
            </a>{" "}
            to generate your Refresh Token.
          </p>
          <div className="border-solid border-gray-600 border rounded-md p-6 mt-2">
            <CredentialForm<AlationCredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="alation_user_id"
                    label="Alation User ID:"
                  />
                  <TextFormField
                    name="alation_refresh_token"
                    label="Refresh Token:"
                    type="password"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                alation_user_id: Yup.number()
                  .positive()
                  .integer()
                  .required(
                    "Please enter the ID number of your User in Alation",
                  ),
                alation_refresh_token: Yup.string().required(
                  "Please enter your Alation refresh token",
                ),
              })}
              initialValues={{
                alation_user_id: 0,
                alation_refresh_token: "",
              }}
              onSubmit={(isSuccess) => {
                if (isSuccess) {
                  mutate("/api/manage/credential");
                }
              }}
            />
          </div>
        </>
      )}

      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 2: Provide your Alation server's URL
      </h2>
      {alationCredential ? (
        <>
          {alationConnectorIndexingStatuses.length > 0 ? (
            <>
              <p className="text-sm mb-2">
                The Alation server is re-indexed once every 24 hours.
              </p>
              <div className="mb-2">
                <ConnectorsTable<AlationConfig, AlationCredentialJson>
                  connectorIndexingStatuses={alationConnectorIndexingStatuses}
                  liveCredential={alationCredential}
                  getCredential={(credential) => {
                    return (
                      <div>
                        <p>
                          {credential.credential_json.alation_refresh_token}
                        </p>
                      </div>
                    );
                  }}
                  onCredentialLink={async (connectorId) => {
                    if (alationCredential) {
                      await linkCredential(connectorId, alationCredential.id);
                      mutate("/api/manage/admin/connector/indexing-status");
                    }
                  }}
                  specialColumns={[
                    {
                      header: "Url",
                      key: "server_url",
                      getValue: (connector) => (
                        <a
                          className="text-blue-500"
                          href={connector.connector_specific_config.server_url}
                        >
                          {connector.connector_specific_config.server_url}
                        </a>
                      ),
                    },
                    {
                      header: "Batch Size",
                      key: "batch_size",
                      getValue: (connector) =>
                        connector.connector_specific_config.batch_size || "16",
                    },
                    {
                      header: "Max per type",
                      key: "max_objects_to_index_per_type",
                      getValue: (connector) =>
                        connector.connector_specific_config
                          .max_objects_to_index_per_type || "Unlimited",
                    },
                  ]}
                  onUpdate={() =>
                    mutate("/api/manage/admin/connector/indexing-status")
                  }
                />
              </div>
            </>
          ) : (
            <div className="border-solid border-gray-600 border rounded-md p-6 mt-4">
              <ConnectorForm<AlationConfig>
                nameBuilder={(values) =>
                  `AlationConnector-${values.server_url}`
                }
                source="alation"
                inputType="load_state"
                formBody={
                  <>
                    <TextFormField
                      name="server_url"
                      label="Alation Server URL:"
                    />
                    <TextFormField
                      name="batch_size"
                      label="Batch Size:"
                      type="number"
                    />
                    <TextFormField
                      name="max_objects_to_index_per_type"
                      label="Maximum objects to index per Object Type (0 = unlimited):"
                      type="number"
                    />
                  </>
                }
                validationSchema={Yup.object().shape({
                  server_url: Yup.string().required(
                    "Please enter the url to your Alation server eg. https://mycompany.alationcloud.com",
                  ),
                  batch_size: Yup.number()
                    .integer()
                    .min(10)
                    .max(100)
                    .required(
                      "Please enter a size to batch requests between 10 - 100",
                    ),
                  max_objects_to_index_per_type: Yup.number().integer(),
                })}
                initialValues={{
                  server_url: "",
                  batch_size: 100,
                  max_objects_to_index_per_type: 0,
                }}
                refreshFreq={24 * 60 * 60} // 24 hours
                onSubmit={async (isSuccess, responseJson) => {
                  if (isSuccess && responseJson) {
                    await linkCredential(responseJson.id, alationCredential.id);
                    mutate("/api/manage/admin/connector/indexing-status");
                  }
                }}
              />
            </div>
          )}
        </>
      ) : (
        <p className="text-sm">
          Please provide your refresh token in Step 1 first! Once done with
          that, you can then specify which Alation server you want to make
          searchable.
        </p>
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
        <AlationIcon size="32" />
        <h1 className="text-3xl font-bold pl-2">Alation</h1>
      </div>
      <Main />
    </div>
  );
}
