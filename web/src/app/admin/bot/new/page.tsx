import { AdminPageTitle } from "@/components/admin/Title";
import { CPUIcon } from "@/components/icons/icons";
import { SlackBotCreationForm } from "../SlackBotConfigCreationForm";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { DocumentSet } from "@/lib/types";
import { BackButton } from "@/components/BackButton";
import { Text } from "@tremor/react";

async function Page() {
  const documentSetsResponse = await fetchSS("/manage/document-set");
  if (!documentSetsResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch document sets - ${await documentSetsResponse.text()}`}
      />
    );
  }
  const documentSets = (await documentSetsResponse.json()) as DocumentSet[];

  return (
    <div className="container mx-auto dark">
      <BackButton />
      <AdminPageTitle
        icon={<CPUIcon size={32} />}
        title="New Slack Bot Config"
      />

      <Text className="mb-8">
        Define a new configuration below! This config will determine how
        DanswerBot behaves in the specified channels.
      </Text>

      <SlackBotCreationForm documentSets={documentSets} />
    </div>
  );
}

export default Page;
