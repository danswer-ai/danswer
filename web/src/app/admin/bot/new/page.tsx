import { AdminPageTitle } from "@/components/admin/Title";
import { CPUIcon } from "@/components/icons/icons";
import { SlackBotCreationForm } from "../SlackBotConfigCreationForm";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { DocumentSet } from "@/lib/types";
import { BackButton } from "@/components/BackButton";
import { Text } from "@tremor/react";
import { redirect } from "next/navigation";
import {
  FetchAssistantsResponse,
  fetchAssistantsSS,
} from "@/lib/assistants/fetchAssistantsSS";


async function Page({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const app_id = searchParams?.app_id || null;
  if (!app_id || typeof app_id !== "string") {
    redirect("/admin/bot"); // Redirect if app_id is missing
    return null; // Return null after redirect
  }

  const tasks = [fetchSS("/manage/document-set"), fetchAssistantsSS()];
  const [documentSetsResponse, [assistants, assistantsFetchError]] =
    (await Promise.all(tasks)) as [Response, FetchAssistantsResponse];

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
        errorMsg={`Failed to fetch assistants - ${assistantsFetchError}`}
      />
    );
  }

  return (
    <div className="container mx-auto">
      <BackButton />
      <AdminPageTitle
        icon={<CPUIcon size={32} />}
        title="New Slack Bot Config"
      />

      <Text className="mb-8">
        Define a new configuration below! This config will determine how
        DanswerBot behaves in the specified channels.
      </Text>

      <SlackBotCreationForm
        app_id={app_id}
        documentSets={documentSets}
        personas={assistants}
      />
    </div>
  );
}

export default Page;
