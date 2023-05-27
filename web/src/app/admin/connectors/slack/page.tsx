"use client";

import * as Yup from "yup";
import { SlackIcon, TrashIcon } from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import useSWR, { useSWRConfig } from "swr";
import { LoadingAnimation } from "@/components/Loading";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  Connector,
  SlackConfig,
  Credential,
  SlackCredentialJson,
} from "@/lib/types";
import { deleteCredential, linkCredential } from "@/lib/credential";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import { TextFormField } from "@/components/admin/connectors/Field";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";

const MainSection = () => {
  const { mutate } = useSWRConfig();
  const {
    data: connectorsData,
    isLoading: isConnectorsLoading,
    error: isConnectorsError,
  } = useSWR<Connector<SlackConfig>[]>("/api/admin/connector", fetcher);

  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    isValidating: isCredentialsValidating,
    error: isCredentialsError,
  } = useSWR<Credential<SlackCredentialJson>[]>(
    "/api/admin/credential",
    fetcher
  );

  if (isConnectorsLoading || isCredentialsLoading || isCredentialsValidating) {
    return <LoadingAnimation text="Loading" />;
  }

  if (isConnectorsError || !connectorsData) {
    return <div>Failed to load connectors</div>;
  }

  if (isCredentialsError || !credentialsData) {
    return <div>Failed to load credentials</div>;
  }

  const slackConnectors = connectorsData.filter(
    (connector) => connector.source === "slack"
  );
  const slackCredential = credentialsData.filter(
    (credential) => credential.credential_json?.slack_bot_token
  )[0];

  return (
    <>
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide Credentials
      </h2>
      {slackCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing Slack Bot Token: </p>
            <p className="ml-1 italic my-auto">
              {slackCredential.credential_json.slack_bot_token}
            </p>{" "}
            <button
              className="ml-1 hover:bg-gray-700 rounded-full p-1"
              onClick={async () => {
                await deleteCredential(slackCredential.id);
                mutate("/api/admin/credential");
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm mb-4">
            To use the Slack connector, you must first provide a Slack bot token
            corresponding to the Slack App set up in your workspace. For more
            details on setting up the Danswer Slack App, see the{" "}
            <a
              className="text-blue-500"
              href="https://docs.danswer.dev/connectors/slack#setting-up"
            >
              docs
            </a>
            .
          </p>
          <div className="border-solid border-gray-600 border rounded-md p-6 mt-2">
            <CredentialForm<SlackCredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="slack_bot_token"
                    label="Slack Bot Token:"
                    type="password"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                slack_bot_token: Yup.string().required(
                  "Please enter your Slack bot token"
                ),
              })}
              initialValues={{
                slack_bot_token: "",
              }}
              onSubmit={(isSuccess) => {
                if (isSuccess) {
                  mutate("/api/admin/credential");
                }
              }}
            />
          </div>
        </>
      )}

      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 2: Which workspaces do you want to make searchable?
      </h2>

      {connectorsData.length > 0 && (
        <>
          <p className="text-sm mb-2">
            We pull the latest messages from each workspace listed below every{" "}
            <b>10</b> minutes.
          </p>
          <div className="mb-2">
            <ConnectorsTable
              connectors={slackConnectors}
              liveCredential={slackCredential}
              getCredential={(credential) => credential.credential_json.slack_bot_token}
              specialColumns={[
                {
                  header: "Workspace",
                  key: "workspace",
                  getValue: (connector) => connector.connector_specific_config.workspace,
                },
              ]}
              onDelete={() => mutate("/api/admin/connector")}
              onCredentialLink={async (connectorId) => {
                if (slackCredential) {
                  await linkCredential(connectorId, slackCredential.id);
                  mutate("/api/admin/connector");
                }
              }}
            />
          </div>
        </>
      )}

      <div className="border-solid border-gray-600 border rounded-md p-6 mt-4">
        <h2 className="font-bold mb-3">Connect to a New Workspace</h2>
        <ConnectorForm<SlackConfig>
          nameBuilder={(values) => `SlackConnector-${values.workspace}`}
          source="slack"
          inputType="poll"
          formBody={
            <>
              <TextFormField name="workspace" label="Workspace:" />
            </>
          }
          validationSchema={Yup.object().shape({
            workspace: Yup.string().required(
              "Please enter the workspace to index"
            ),
          })}
          initialValues={{
            workspace: "",
          }}
          refreshFreq={10 * 60} // 10 minutes
          onSubmit={async (isSuccess, responseJson) => {
            if (isSuccess && responseJson) {
              await linkCredential(responseJson.id, slackCredential.id);
              mutate("/api/admin/connector");
            }
          }}
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
        <SlackIcon size="32" />
        <h1 className="text-3xl font-bold pl-2">Slack</h1>
      </div>
      <MainSection />
    </div>
  );
}
