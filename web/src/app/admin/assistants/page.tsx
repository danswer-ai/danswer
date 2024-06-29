import { PersonasTable } from "@/components/adminPageComponents/assistants/AdminAssistantsPersonaTable";

import { Text, Title } from "@tremor/react";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { Persona } from "./interfaces";
import { RobotIcon } from "@/components/icons/icons";
import { AdminPageTitle } from "@/components/adminPageComponents/Title";
import AssistantsCreator from "@/components/adminPageComponents/assistants/AdminAssistantsCreator";

export default async function Page() {
  const personaResponse = await fetchSS("/admin/persona");

  if (!personaResponse.ok) {
    const errorText = await personaResponse.text();
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch personas - ${errorText}`}
      />
    );
  }

  const personas = (await personaResponse.json()) as Persona[];

  return (
    <div className="mx-auto container">
      <AdminPageTitle icon={<RobotIcon size={32} />} title="Assistants" />

      <Text className="mb-2">
        Assistants are a way to build custom search/question-answering
        experiences for different use cases.
      </Text>
      <Text className="mt-2">They allow you to customize:</Text>
      <div className="text-sm">
        <ul className="list-disc mt-2 ml-4">
          <li>
            The prompt used by your LLM of choice to respond to the user query
          </li>
          <li>The documents that are used as context</li>
        </ul>
      </div>

      <AssistantsCreator />
      <Title>Existing Assistants</Title>
      <PersonasTable personas={personas} />
    </div>
  );
}
