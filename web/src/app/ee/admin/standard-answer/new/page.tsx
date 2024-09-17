import { AdminPageTitle } from "@/components/admin/Title";
import { StandardAnswerCreationForm } from "@/app/ee/admin/standard-answer/StandardAnswerCreationForm";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { BackButton } from "@/components/BackButton";
import { Text } from "@tremor/react";
import { ClipboardIcon } from "@/components/icons/icons";
import { Persona } from "@/app/admin/assistants/interfaces";

async function Page() {
  const allPersonaResponse = await fetchSS("/admin/persona");
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
        title="New Standard Answer"
        icon={<ClipboardIcon size={32} />}
      />

      <StandardAnswerCreationForm existingPersonas={allPersonas} />
    </div>
  );
}

export default Page;
