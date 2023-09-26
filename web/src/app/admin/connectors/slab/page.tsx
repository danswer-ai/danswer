"use client";

import * as Yup from "yup";
import { SlabIcon, TrashIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import {
  ConnectorIndexingStatus,
  SlabCredentialJson,
  SlabConfig,
  Credential,
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

  const slabConnectorIndexingStatuses: ConnectorIndexingStatus<
    SlabConfig,
    SlabCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "slab"
  );
  const slabCredential: Credential<SlabCredentialJson> | undefined =
    credentialsData.find(
      (credential) => credential.credential_json?.slab_bot_token
    );

  return (
    <>
      {popup}
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your Credentials
      </h2>

      {slabCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing Slab Bot Token: </p>
            <p className="ml-1 italic my-auto max-w-md truncate">
              {slabCredential.credential_json?.slab_bot_token}
            </p>
            <button
              className="ml-1 hover:bg-gray-700 rounded-full p-1"
              onClick={async () => {
                if (slabConnectorIndexingStatuses.length > 0) {
                  setPopup({
                    type: "error",
                    message:
                      "Must delete all connectors before deleting credentials",
                  });
                  return;
                }
                await adminDeleteCredential(slabCredential.id);
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
            To use the Slab connector, first follow the guide{" "}
            <a
              className="text-blue-500"
              href="https://docs.danswer.dev/connectors/slab#setting-up"
            >
              here
            </a>{" "}
            to generate a Slab Bot Token.
          </p>
          <div className="border-solid border-gray-600 border rounded-md p-6 mt-2">
            <CredentialForm<SlabCredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="slab_bot_token"
                    label="Slab Bot Token:"
                    type="password"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                slab_bot_token: Yup.string().required(
                  "Please enter your Slab Bot Token"
                ),
              })}
              initialValues={{
                slab_bot_token: "",
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
        Step 2: What&apos;s the base URL for your Slab team?
      </h2>
      {slabCredential ? (
        <>
          {slabConnectorIndexingStatuses.length > 0 ? (
            <>
              <p className="text-sm mb-2">
                We are pulling the latest documents from{" "}
                <a
                  href={
                    slabConnectorIndexingStatuses[0].connector
                      .connector_specific_config.base_url
                  }
                  className="text-blue-600"
                >
                  {
                    slabConnectorIndexingStatuses[0].connector
                      .connector_specific_config.base_url
                  }
                </a>{" "}
                every <b>10</b> minutes.
              </p>
              <ConnectorsTable<SlabConfig, SlabCredentialJson>
                connectorIndexingStatuses={slabConnectorIndexingStatuses}
                liveCredential={slabCredential}
                getCredential={(credential) => {
                  return (
                    <div>
                      <p>{credential.credential_json.slab_bot_token}</p>
                    </div>
                  );
                }}
                onCredentialLink={async (connectorId) => {
                  if (slabCredential) {
                    await linkCredential(connectorId, slabCredential.id);
                    mutate("/api/manage/admin/connector/indexing-status");
                  }
                }}
                specialColumns={[
                  {
                    header: "Url",
                    key: "url",
                    getValue: (connector) => (
                      <a
                        className="text-blue-500"
                        href={connector.connector_specific_config.base_url}
                      >
                        {connector.connector_specific_config.base_url}
                      </a>
                    ),
                  },
                ]}
                onUpdate={() =>
                  mutate("/api/manage/admin/connector/indexing-status")
                }
              />
            </>
          ) : (
            <>
              <p className="text-sm mb-4">
                Specify the base URL for your Slab team below. This will look
                something like:{" "}
                <b>
                  <i>https://danswer.slab.com/</i>
                </b>
              </p>
              <div className="border-solid border-gray-600 border rounded-md p-6 mt-4">
                <h2 className="font-bold mb-3">Add a New Space</h2>
                <ConnectorForm<SlabConfig>
                  nameBuilder={(values) => `SlabConnector-${values.base_url}`}
                  ccPairNameBuilder={(values) => values.base_url}
                  source="slab"
                  inputType="poll"
                  formBody={
                    <>
                      <TextFormField name="base_url" label="Base URL:" />
                    </>
                  }
                  validationSchema={Yup.object().shape({
                    base_url: Yup.string().required(
                      "Please enter the base URL for your team e.g. https://danswer.slab.com/"
                    ),
                  })}
                  initialValues={{
                    base_url: "",
                  }}
                  refreshFreq={10 * 60} // 10 minutes
                  credentialId={slabCredential.id}
                />
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <p className="text-sm">
            Please provide your access token in Step 1 first! Once done with
            that, you can then specify the URL for your Slab team and get
            started with indexing.
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
        <SlabIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Slab</h1>
      </div>
      <Main />
    </div>
  );
}
