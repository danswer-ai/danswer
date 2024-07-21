import React from "react";
import useSWR, { useSWRConfig } from "swr";

import { errorHandlingFetcher } from "@/lib/fetcher";
import * as Yup from "yup";

import MultiStepForm, { FormSchema } from "../../Form";
import {
  ConnectorIndexingStatus,
  Credential,
  SlackConfig,
  SlackCredentialJson,
} from "@/lib/types";
import { usePublicCredentials } from "@/lib/hooks";
import { LoadingAnimation } from "@/components/Loading";
import { ErrorCallout } from "@/components/ErrorCallout";
import {
  BooleanFormField,
  TextArrayFieldBuilder,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { Button, Text, Title } from "@tremor/react";
import { TrashIcon } from "@/components/icons/icons";
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import BackToggle from "../BackToggle";

const MainSectio: React.FC = () => {
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

  const slackConnectorIndexingStatuses: ConnectorIndexingStatus<
    SlackConfig,
    SlackCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "slack"
  );
  const slackCredential: Credential<any> | undefined = credentialsData.find(
    (credential) => credential.credential_json?.slack_bot_token
  );

  const schema: FormSchema = {
    slack_bot_token: {
      type: "string",
      label: "Slack Bot Token",
      component: <div />,
      props: { type: "password" },
    },
    workspace: {
      type: "string",
      label: "Workspace",
      component: <div />,
    },
    channels: {
      type: "array",
      label: "Channels",
      component: <div />,
      props: {
        subtext: `
            Specify 0 or more channels to index. For example, specifying the channel
            "support" will cause us to only index all content within the "#support" channel.
            If no channels are specified, all channels in your workspace will be indexed.`,
      },
    },
    channel_regex_enabled: {
      type: "boolean",
      label: "Regex Enabled?",
      component: <div />,
      props: {
        subtext: (
          <div>
            If enabled, we will treat the &quot;channels&quot; specified above
            as regular expressions. A channel&apos;s messages will be pulled in
            by the connector if the name of the channel fully matches any of the
            specified regular expressions.
            <br />
            For example, specifying <i>.*-support.*</i> as a &quot;channel&quot;
            will cause the connector to include any channels with
            &quot;-support&quot; in the name.
          </div>
        ),
      },
    },
  };

  const formConfig = {
    schema: schema,
    steps: [
      {
        title: "Step 1: Provide Credentials",
        fields: ["slack_bot_token"],
      },
      {
        title: "Step 2: Configure Workspace",
        fields: ["workspace", "channels", "channel_regex_enabled"],
      },
    ],
    onSubmit: async (data: Record<string, any>) => {
      // Handle form submission
      console.log("Form submitted:", data);
      // Add your submission logic here
    },
  };

  const renderCredentialInfo = () =>
    slackCredential ? (
      <div className="flex mb-1 text-sm">
        <Text className="my-auto">Current Slack Bot Token: </Text>
        <Text className="ml-1 italic my-auto">
          {slackCredential.credential_json.slack_bot_token}
        </Text>
        <Button
          size="xs"
          color="red"
          className="ml-3 text-inverted"
          onClick={async () => {
            await adminDeleteCredential(slackCredential.id);
            refreshCredentials();
          }}
        >
          <TrashIcon />
        </Button>
      </div>
    ) : null;

  const renderConnectorsTable = () =>
    slackConnectorIndexingStatuses.length > 0 ? (
      <>
        <Text className="mb-2">
          We pull the latest messages from each workspace listed below every{" "}
          <b>10</b> minutes.
        </Text>
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
                getValue: (ccPairStatus) =>
                  ccPairStatus.connector.connector_specific_config.workspace,
              },
              {
                header: "Channels",
                key: "channels",
                getValue: (ccPairStatus: any) => {
                  const connectorConfig =
                    ccPairStatus.connector.connector_specific_config;
                  return connectorConfig.channels &&
                    connectorConfig.channels.length > 0
                    ? connectorConfig.channels.join(", ")
                    : "";
                },
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
    ) : null;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <MultiStepForm
        schema={formConfig.schema}
        steps={formConfig.steps}
        onSubmit={formConfig.onSubmit}
        // renderBefore={(step: any) => (
        //     <>
        //         <Title className="mb-2 mt-6 ml-auto mr-auto">
        //             {formConfig.steps[step].title}
        //         </Title>
        //         {step === 0 && renderCredentialInfo()}
        //         {step === 1 && renderConnectorsTable()}
        //     </>
        // )}
        // renderAfter={(step: any) => (
        //     <BackToggle
        //         button1={step > 0 ? { text: "Back", onClick: () => { } } : undefined}
        //         button2={{
        //             text: step < formConfig.steps.length - 1 ? "Next" : "Finalize",
        //             onClick: () => { }
        //         }}
        //         advanced
        //     />
        // )}
      />
    </div>
  );
};

export default MainSectio;
