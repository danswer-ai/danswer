import { AdminPageTitle } from "@/components/admin/Title";
import { CPUIcon } from "@/components/icons/icons";
import { SlackChannelConfigCreationForm } from "../SlackChannelConfigCreationForm";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { DocumentSet, SlackChannelConfig } from "@/lib/types";
import Text from "@/components/ui/text";
import { BackButton } from "@/components/BackButton";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import {
  FetchAssistantsResponse,
  fetchAssistantsSS,
} from "@/lib/assistants/fetchAssistantsSS";
import { getStandardAnswerCategoriesIfEE } from "@/components/standardAnswers/getStandardAnswerCategoriesIfEE";

async function EditslackChannelConfigPage(props: {
  params: Promise<{ id: number }>;
}) {
  const params = await props.params;
  const tasks = [
    fetchSS("/manage/admin/slack-app/channel"),
    fetchSS("/manage/document-set"),
    fetchAssistantsSS(),
  ];

  const [
    slackChannelsResponse,
    documentSetsResponse,
    [assistants, assistantsFetchError],
  ] = (await Promise.all(tasks)) as [
    Response,
    Response,
    FetchAssistantsResponse,
  ];

  const eeStandardAnswerCategoryResponse =
    await getStandardAnswerCategoriesIfEE();

  if (!slackChannelsResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch Slack Channels - ${await slackChannelsResponse.text()}`}
      />
    );
  }
  const allslackChannelConfigs =
    (await slackChannelsResponse.json()) as SlackChannelConfig[];
  console.log("allslackChannelConfigs", allslackChannelConfigs);
  console.log("params.id", params.id);
  const slackChannelConfig = allslackChannelConfigs.find(
    (config) => config.id === Number(params.id)
  );
  console.log("slackChannelConfig", slackChannelConfig);
  if (!slackChannelConfig) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Did not find Slack Channel config with ID: ${params.id}`}
      />
    );
  }

  if (!documentSetsResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch document sets - ${await documentSetsResponse.text()}`}
      />
    );
  }
  const documentSets = (await documentSetsResponse.json()) as DocumentSet[];

  if (assistantsFetchError) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch personas - ${assistantsFetchError}`}
      />
    );
  }

  return (
    <div className="container mx-auto">
      <InstantSSRAutoRefresh />

      <BackButton />
      <AdminPageTitle
        icon={<CPUIcon size={32} />}
        title="Edit Slack Channel Config"
      />

      <Text className="mb-8">
        Edit the existing configuration below! This config will determine how
        DanswerBot behaves in the specified channels.
      </Text>

      <SlackChannelConfigCreationForm
        slack_bot_id={slackChannelConfig.slack_bot_id}
        documentSets={documentSets}
        personas={assistants}
        standardAnswerCategoryResponse={eeStandardAnswerCategoryResponse}
        existingSlackChannelConfig={slackChannelConfig}
      />
    </div>
  );
}

export default EditslackChannelConfigPage;
