"use client";

import * as Yup from "yup";
import { SlackIcon, TrashIcon } from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import useSWR, { useSWRConfig } from "swr";
import { LoadingAnimation } from "@/components/Loading";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  SlackConfig,
  SlackCredentialJson,
  ConnectorIndexingStatus,
  Credential,
} from "@/lib/types";
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import {
  TextFormField,
  TextArrayFieldBuilder,
} from "@/components/admin/connectors/Field";
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

  const slackConnectorIndexingStatuses: ConnectorIndexingStatus<
    SlackConfig,
    SlackCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "slack"
  );
  const slackCredential: Credential<SlackCredentialJson> | undefined =
    credentialsData.find(
      (credential) => credential.credential_json?.slack_bot_token
    );

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
                await adminDeleteCredential(slackCredential.id);
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
                  refreshCredentials();
                }
              }}
            />
          </div>
        </>
      )}

      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 2: Which channels do you want to make searchable?
      </h2>

      {slackConnectorIndexingStatuses.length > 0 && (
        <>
          <p className="text-sm mb-2">
            We pull the latest messages from each workspace listed below every{" "}
            <b>10</b> minutes.
          </p>
          <div className="mb-2">
            <ConnectorsTable<SlackConfig, SlackCredentialJson>
              connectorIndexingStatuses={slackConnectorIndexingStatuses}
              liveCredential={slackCredential}
              getCredential={(credential) =>
                credential.credential_json.slack_bot_token
              }
              specialColumns={[
                {
                  header: "Workspace",
                  key: "workspace",
                  getValue: (connector) =>
                    connector.connector_specific_config.workspace,
                },
                {
                  header: "Channels",
                  key: "channels",
                  getValue: (connector) =>
                    connector.connector_specific_config.channels &&
                    connector.connector_specific_config.channels.length > 0
                      ? connector.connector_specific_config.channels.join(", ")
                      : "",
                },
              ]}
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
              onCredentialLink={async (connectorId) => {
                if (slackCredential) {
                  await linkCredential(connectorId, slackCredential.id);
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
            />
          </div>
        </>
      )}

      {slackCredential ? (
        <div className="border-solid border-gray-600 border rounded-md p-6 mt-4">
          <h2 className="font-bold mb-3">Connect to a New Workspace</h2>
          <ConnectorForm<SlackConfig>
            nameBuilder={(values) =>
              values.channels
                ? `SlackConnector-${values.workspace}-${values.channels.join(
                    "_"
                  )}`
                : `SlackConnector-${values.workspace}`
            }
            source="slack"
            inputType="poll"
            formBody={
              <>
                <TextFormField name="workspace" label="Workspace" />
              </>
            }
            formBodyBuilder={TextArrayFieldBuilder({
              name: "channels",
              label: "Channels:",
              subtext:
                "Specify 0 or more channels to index. For example, specifying the channel " +
                "'support' will cause us to only index all content " +
                "within the '#support' channel. " +
                "If no channels are specified, all channels in your workspace will be indexed.",
            })}
            validationSchema={Yup.object().shape({
              workspace: Yup.string().required(
                "Please enter the workspace to index"
              ),
              channels: Yup.array()
                .of(Yup.string().required("Channel names must be strings"))
                .required(),
            })}
            initialValues={{
              workspace: "",
              channels: [],
            }}
            refreshFreq={10 * 60} // 10 minutes
            credentialId={slackCredential.id}
          />
        </div>
      ) : (
        <p className="text-sm">
          Please provide your slack bot token in Step 1 first! Once done with
          that, you can then specify which Slack channels you want to make
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
        <SlackIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Slack</h1>
      </div>
      <MainSection />
    </div>
  );
}
