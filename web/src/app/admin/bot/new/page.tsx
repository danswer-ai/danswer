import { AdminPageTitle } from "@/components/admin/Title";
import { CPUIcon } from "@/components/icons/icons";
import { SlackBotConfigCreationForm } from "../SlackBotConfigCreationForm";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { DocumentSet } from "@/lib/types";
import { BackButton } from "@/components/BackButton";
import { fetchAssistantsSS } from "@/lib/assistants/fetchAssistantsSS";
import {
  getStandardAnswerCategoriesIfEE,
  StandardAnswerCategoryResponse,
} from "@/components/standardAnswers/getStandardAnswerCategoriesIfEE";
import { redirect } from "next/navigation";
import { Persona } from "../../assistants/interfaces";

async function NewSlackBotConfigPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const app_id_raw = searchParams?.app_id || null;
  const app_id = app_id_raw ? parseInt(app_id_raw as string, 10) : null;
  if (!app_id || isNaN(app_id)) {
    redirect("/admin/bot");
    return null;
  }

  const [
    documentSetsResponse,
    assistantsResponse,
    standardAnswerCategoryResponse,
  ] = await Promise.all([
    fetchSS("/manage/document-set") as Promise<Response>,
    fetchAssistantsSS() as Promise<[Persona[], string | null]>,
    getStandardAnswerCategoriesIfEE() as Promise<StandardAnswerCategoryResponse>,
  ]);

  if (!documentSetsResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch document sets - ${await documentSetsResponse.text()}`}
      />
    );
  }
  const documentSets = (await documentSetsResponse.json()) as DocumentSet[];

  if (assistantsResponse[1]) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch assistants - ${assistantsResponse[1]}`}
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

      <SlackBotConfigCreationForm
        app_id={app_id}
        documentSets={documentSets}
        personas={assistantsResponse[0]}
        standardAnswerCategoryResponse={standardAnswerCategoryResponse}
      />
    </div>
  );
}

export default NewSlackBotConfigPage;
