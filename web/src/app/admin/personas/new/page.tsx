import { PersonaEditor } from "../PersonaEditor";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { DocumentSet } from "@/lib/types";
import { RobotIcon } from "@/components/icons/icons";
import { BackButton } from "@/components/BackButton";
import { Card } from "@tremor/react";
import { AdminPageTitle } from "@/components/admin/Title";

export default async function Page() {
  const [documentSetsResponse, llmOverridesResponse, defaultLLMResponse] =
    await Promise.all([
      fetchSS("/manage/document-set"),
      fetchSS("/admin/persona/utils/list-available-models"),
      fetchSS("/admin/persona/utils/default-model"),
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

  if (!llmOverridesResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch LLM override options - ${await documentSetsResponse.text()}`}
      />
    );
  }
  const llmOverrideOptions = (await llmOverridesResponse.json()) as string[];

  if (!defaultLLMResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch default LLM - ${await documentSetsResponse.text()}`}
      />
    );
  }
  const defaultLLM = (await defaultLLMResponse.json()) as string;

  return (
    <div>
      <BackButton />

      <AdminPageTitle
        title="Create a New Persona"
        icon={<RobotIcon size={32} />}
      />

      <Card>
        <PersonaEditor
          documentSets={documentSets}
          llmOverrideOptions={llmOverrideOptions}
          defaultLLM={defaultLLM}
        />
      </Card>
    </div>
  );
}
