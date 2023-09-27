"use client";

import * as Yup from "yup";
import { ZulipIcon, TrashIcon } from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import useSWR, { useSWRConfig } from "swr";
import { LoadingAnimation } from "@/components/Loading";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  ZulipConfig,
  Credential,
  ZulipCredentialJson,
  ConnectorIndexingStatus,
} from "@/lib/types";
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import { TextFormField } from "@/components/admin/connectors/Field";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { usePublicCredentials } from "@/lib/hooks";

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

  const zulipConnectorIndexingStatuses: ConnectorIndexingStatus<
    ZulipConfig,
    ZulipCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "zulip"
  );
  const zulipCredential: Credential<ZulipCredentialJson> =
    credentialsData.filter(
      (credential) => credential.credential_json?.zuliprc_content
    )[0];

  return (
    <>
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide Credentials
      </h2>
      {zulipCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing zuliprc file content: </p>
            <p className="ml-1 italic my-auto">
              {zulipCredential.credential_json.zuliprc_content}
            </p>{" "}
            <button
              className="ml-1 hover:bg-gray-700 rounded-full p-1"
              onClick={async () => {
                await adminDeleteCredential(zulipCredential.id);
                refreshCredentials();
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm mb-4">
            To use the Zulip connector, you must first provide content of the
            zuliprc config file. For more details on setting up the Danswer
            Zulip connector, see the{" "}
            <a
              className="text-blue-500"
              href="https://docs.danswer.dev/connectors/zulip"
            >
              docs
            </a>
            .
          </p>
          <div className="border-solid border-gray-600 border rounded-md p-6 mt-2">
            <CredentialForm<ZulipCredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="zuliprc_content"
                    label="Content of the zuliprc file:"
                    type="text"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                zuliprc_content: Yup.string().required(
                  "Please enter content of the zuliprc file"
                ),
              })}
              initialValues={{
                zuliprc_content: "",
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
        Step 2: Which workspaces do you want to make searchable?
      </h2>

      {zulipConnectorIndexingStatuses.length > 0 && (
        <>
          <p className="text-sm mb-2">
            We pull the latest messages from each workspace listed below every{" "}
            <b>10</b> minutes.
          </p>
          <div className="mb-2">
            <ConnectorsTable
              connectorIndexingStatuses={zulipConnectorIndexingStatuses}
              liveCredential={zulipCredential}
              getCredential={(credential) =>
                credential.credential_json.zuliprc_content
              }
              specialColumns={[
                {
                  header: "Realm name",
                  key: "realm_name",
                  getValue: (connector) =>
                    connector.connector_specific_config.realm_name,
                },
                {
                  header: "Realm url",
                  key: "realm_url",
                  getValue: (connector) =>
                    connector.connector_specific_config.realm_url,
                },
              ]}
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
              onCredentialLink={async (connectorId) => {
                if (zulipCredential) {
                  await linkCredential(connectorId, zulipCredential.id);
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
            />
          </div>
        </>
      )}

      <div className="border-solid border-gray-600 border rounded-md p-6 mt-4">
        <h2 className="font-bold mb-3">Connect to a New Realm</h2>
        <ConnectorForm<ZulipConfig>
          nameBuilder={(values) => `ZulipConnector-${values.realm_name}`}
          ccPairNameBuilder={(values) => values.realm_name}
          source="zulip"
          inputType="poll"
          credentialId={zulipCredential.id}
          formBody={
            <>
              <TextFormField name="realm_name" label="Realm name:" />
              <TextFormField name="realm_url" label="Realm url:" />
            </>
          }
          validationSchema={Yup.object().shape({
            realm_name: Yup.string().required("Please enter the realm name"),
            realm_url: Yup.string().required("Please enter the realm url"),
          })}
          initialValues={{
            realm_name: "",
            realm_url: "",
          }}
          refreshFreq={10 * 60} // 10 minutes
        />
      </div>
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
        <ZulipIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Zulip</h1>
      </div>
      <MainSection />
    </div>
  );
}
