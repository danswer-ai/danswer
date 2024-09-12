import { AdminPageTitle } from "@/components/admin/Title";
import { fetchSS } from "@/lib/utilsSS";
import { Assistant } from "@/app/admin/assistants/interfaces";
import { ErrorCallout } from "@/components/ErrorCallout";
import { GroupsIcon } from "@/components/icons/icons";
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
    <div className="py-24 md:py-32 lg:pt-16">
      <AdminPageTitle
        title="Manage Teamspaces"
        icon={<GroupsIcon size={32} />}
      />

      <Main assistants={assistants} />
    </div>
  );
}
