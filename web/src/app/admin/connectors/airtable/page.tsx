"use client";

import * as Yup from "yup";
import { AirtableIcon, TrashIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  AirtableConfig,
  AirtableCredentialJson,
  Credential,
  ConnectorIndexingStatus,
} from "@/lib/types";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { LoadingAnimation } from "@/components/Loading";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import { deleteCredential, linkCredential } from "@/lib/credential";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";

const Main = () => {
  const { mutate } = useSWRConfig();
  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: isConnectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any>[]>(
    "/api/manage/admin/connector/indexing-status",
    fetcher
  );

  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    error: isCredentialsError,
  } = useSWR<Credential<AirtableCredentialJson>[]>(
    "/api/manage/credential",
    fetcher
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

  const airtableConnectorIndexingStatuses: ConnectorIndexingStatus<AirtableConfig>[] =
    connectorIndexingStatuses.filter(
      (connectorIndexingStatus) =>
        connectorIndexingStatus.connector.source === "airtable"
    );
  const airtableCredential = credentialsData.filter(
    (credential) => credential.credential_json?.airtable_access_token
  )[0];

  return (
    <>
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your access token
      </h2>
      {airtableCredential ? (
        <>
          {" "}
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing Access Token: </p>
            <p className="ml-1 italic my-auto">
              {airtableCredential.credential_json.airtable_access_token}
            </p>{" "}
            <button
              className="ml-1 hover:bg-gray-700 rounded-full p-1"
              onClick={async () => {
                await deleteCredential(airtableCredential.id);
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
            If you don&apos;t have an access token, you can create one at
            https://airtable.com/create/tokens - make sure you are logged in.
            When you make the token, make sure you give it the following scopes:
            data.records:read, data.recordComments:read, schema.bases:read. Also
            ensure that the token is scoped to the base you want, or to all
            bases. All your base are belong to us.
          </p>
          <div className="border-solid border-gray-600 border rounded-md p-6 mt-2">
            <CredentialForm<AirtableCredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="airtable_access_token"
                    label="Personal Access Token:"
                    type="password"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                airtable_access_token: Yup.string().required(
                  "Please enter your personal access token for Airtable"
                ),
              })}
              initialValues={{
                airtable_access_token: "",
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
        Step 2: Which bases and tables do you want to make searchable?
      </h2>

      {airtableConnectorIndexingStatuses.length > 0 && (
        <>
          <p className="text-sm mb-2">
            We pull the latest data from the specified airtable base and table
            every <b>10</b> minutes.
          </p>
          <div className="mb-2">
            <ConnectorsTable<AirtableConfig, AirtableCredentialJson>
              connectorIndexingStatuses={airtableConnectorIndexingStatuses}
              liveCredential={airtableCredential}
              getCredential={(credential) =>
                credential.credential_json.airtable_access_token
              }
              onCredentialLink={async (connectorId) => {
                if (airtableCredential) {
                  await linkCredential(connectorId, airtableCredential.id);
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
              specialColumns={[
                {
                  header: "Base ID",
                  key: "base_id",
                  getValue: (connector) =>
                    `${connector.connector_specific_config.base_id}`,
                },
                {
                  header: "Table Name or ID",
                  key: "table_name_or_id",
                  getValue: (connector) =>
                    `${connector.connector_specific_config.table_name_or_id}`,
                },
              ]}
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
            />
          </div>
        </>
      )}

      {airtableCredential ? (
        <div className="border-solid border-gray-600 border rounded-md p-6 mt-4">
          <h2 className="font-bold mb-3">Connect to a new base and table</h2>
          <ConnectorForm<AirtableConfig>
            nameBuilder={(values) => `AirtableConnector-${values.base_id}`}
            source="airtable"
            inputType="load_state"
            formBody={
              <>
                <TextFormField name="base_id" label="Base ID:" />
                <TextFormField
                  name="table_name_or_id"
                  label="Table Name or ID:"
                />
              </>
            }
            validationSchema={Yup.object().shape({
              base_id: Yup.string().required(
                "Please enter the airtable base ID to index. e.g. app1a2b3c4d5e6f7g8"
              ),
              table_name_or_id: Yup.string().required(
                "Please enter the table name or id to index (id's don't change and are recommended) e.g. Table 1, or tbl1a2b3c4d5e6f7g8"
              ),
            })}
            initialValues={{
              base_id: "",
              table_name_or_id: "",
            }}
            refreshFreq={10 * 60} // 10 minutes
            onSubmit={async (isSuccess, responseJson) => {
              if (isSuccess && responseJson) {
                await linkCredential(responseJson.id, airtableCredential.id);
                mutate("/api/manage/admin/connector/indexing-status");
              }
            }}
          />
        </div>
      ) : (
        <p className="text-sm">
          Please provide your personal access token in Step 1 first! Once done
          with that, you can then specify which bases/tables you want to make
          searchable.
        </p>
      )}
    </>
  );
};

export default function Page() {
  return (
    <div className="container mx-auto">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="border-solid border-gray-600 border-b mb-4 pb-2 flex">
        <AirtableIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Airtable Bases</h1>
      </div>
      <Main />
    </div>
  );
}
