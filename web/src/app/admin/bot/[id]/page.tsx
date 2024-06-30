import { AdminPageTitle } from "@/components/adminPageComponents/Title";
import { CPUIcon } from "@/components/icons/icons";
import { SlackBotCreationForm } from "@/components/adminPageComponents/slackbot/SlackBotConfigCreationForm";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { DocumentSet, SlackBotConfig } from "@/lib/types";
import { Text } from "@tremor/react";
import { BackButton } from "@/components/BackButton";
import { Persona } from "@/interfaces/persona";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";

async function Page({ params }: { params: { id: string } }) {
  const tasks = [
    fetchSS("/manage/admin/slack-bot/config"),
    fetchSS("/manage/document-set"),
    fetchSS("/persona"),
  ];

  const [slackBotsResponse, documentSetsResponse, personasResponse] =
    await Promise.all(tasks);

  if (!slackBotsResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch slack bots - ${await slackBotsResponse.text()}`}
      />
    );
  }
  const allSlackBotConfigs =
    (await slackBotsResponse.json()) as SlackBotConfig[];
  const slackBotConfig = allSlackBotConfigs.find(
    (config) => config.id.toString() === params.id
  );
  if (!slackBotConfig) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Did not find Slack Bot config with ID: ${params.id}`}
      />
    );
  }

  if (!documentSetsResponse.ok) {
    const errorText = await documentSetsResponse.text();
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch document sets - ${errorText}`}
      />
    );
  }
  const documentSets = (await documentSetsResponse.json()) as DocumentSet[];

  if (!personasResponse.ok) {
    const errorText = await personasResponse.text();
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch personas - ${errorText}`}
      />
    );
  }
  const personas = (await personasResponse.json()) as Persona[];

  return (
    <div className="container mx-auto">
      <InstantSSRAutoRefresh />

      <BackButton />
      <AdminPageTitle
        icon={<CPUIcon size={32} />}
        title="Edit Slack Bot Config"
      />

      <Text className="mb-8">
        Edit the existing configuration below! This config will determine how
        DanswerBot behaves in the specified channels.
      </Text>

      <SlackBotCreationForm
        documentSets={documentSets}
        personas={personas}
        existingSlackBotConfig={slackBotConfig}
      />
    </div>
  );
}

export default Page;
