import { fetchSS } from "@/lib/utilsSS";
import { Assistant } from "@/app/admin/assistants/interfaces";
import { ErrorCallout } from "@/components/ErrorCallout";
import { Main } from "./Main";

export default async function Page() {
  const assistantResponse = await fetchSS("/admin/assistant");

  if (!assistantResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch assistants - ${await assistantResponse.text()}`}
      />
    );
  }

  const assistants = (await assistantResponse.json()) as Assistant[];

  return (
    <div className="h-full w-full flex">
      <Main assistants={assistants} />
    </div>
  );
}
