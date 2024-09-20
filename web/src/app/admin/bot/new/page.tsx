import { AdminPageTitle } from "@/components/admin/Title";
import { CPUIcon } from "@/components/icons/icons";
import { SlackBotCreationForm } from "../SlackBotConfigCreationForm";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { DocumentSet, StandaronyxCategory } from "@/lib/types";
import { BackButton } from "@/components/BackButton";
import { Text } from "@tremor/react";
import {
  FetchAssistantsResponse,
  fetchAssistantsSS,
} from "@/lib/assistants/fetchAssistantsSS";
import { getStandaronyxCategoriesIfEE } from "@/components/standaronyxs/getStandaronyxCategoriesIfEE";

async function Page() {
  const tasks = [fetchSS("/manage/document-set"), fetchAssistantsSS()];
  const [
    documentSetsResponse,
    [assistants, assistantsFetchError],
    standaronyxCategoriesResponse,
  ] = (await Promise.all(tasks)) as [
    Response,
    FetchAssistantsResponse,
    Response,
  ];

  const eeStandaronyxCategoryResponse = await getStandaronyxCategoriesIfEE();

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

      <SlackBotCreationForm
        documentSets={documentSets}
        personas={assistants}
        standaronyxCategoryResponse={eeStandaronyxCategoryResponse}
      />
    </div>
  );
}

export default Page;
