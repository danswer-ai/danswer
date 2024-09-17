import { AdminPageTitle } from "@/components/admin/Title";
import { StandardAnswerCreationForm } from "@/app/ee/admin/standard-answer/StandardAnswerCreationForm";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { BackButton } from "@/components/BackButton";
import { ClipboardIcon } from "@/components/icons/icons";
import { StandardAnswer } from "@/lib/types";
import { Persona } from "@/app/admin/assistants/interfaces";

async function Page({ params }: { params: { id: string } }) {
  const tasks = [
    fetchSS("/manage/admin/standard-answer"),
    fetchSS("/admin/persona"),
  ];

  const [standardAnswersResponse, allPersonaResponse] =
    await Promise.all(tasks);
  if (!standardAnswersResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch standard answers - ${await standardAnswersResponse.text()}`}
      />
    );
  }
  const allStandardAnswers =
    (await standardAnswersResponse.json()) as StandardAnswer[];
  const standardAnswer = allStandardAnswers.find(
    (answer) => answer.id.toString() === params.id
  );
  if (!standardAnswer) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Did not find standard answer with ID: ${params.id}`}
      />
    );
  }

  if (!allPersonaResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch personas - ${await allPersonaResponse.text()}`}
      />
    );
  }
  const allPersonas = (await allPersonaResponse.json()) as Persona[];

  return (
    <div className="container mx-auto">
      <BackButton />
      <AdminPageTitle
        title="Edit Standard Answer"
        icon={<ClipboardIcon size={32} />}
      />

      <StandardAnswerCreationForm
        existingStandardAnswer={standardAnswer}
        existingPersonas={allPersonas}
      />
    </div>
  );
}

export default Page;
