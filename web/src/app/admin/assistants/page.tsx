import { AssistantsTable } from "./AssistantTable";
import Link from "next/link";
import { Divider, Text, Title } from "@tremor/react";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { Assistant } from "./interfaces";
import { RobotIcon } from "@/components/icons/icons";
import { AdminPageTitle } from "@/components/admin/Title";
import { Button } from "@/components/ui/button";
import { SquarePlus } from "lucide-react";

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
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <AdminPageTitle icon={<RobotIcon size={32} />} title="Assistants" />

        <p className="mb-2">
          Assistants are a way to build custom search/question-answering
          experiences for different use cases.
        </p>
        <p className="mt-2">They allow you to customize:</p>
        <ul className="list-disc mt-2 ml-4 text-sm">
          <li>
            The prompt used by your LLM of choice to respond to the user query
          </li>
          <li>The documents that are used as context</li>
        </ul>

        <div>
          <Divider />

          <h3>Create an Assistant</h3>
          <Link href="/admin/assistants/new" className="flex items-center">
            <Button className="mt-2">
              <SquarePlus size={16} />
              New Assistant
            </Button>
          </Link>

          <Divider />

          <h3>Existing Assistants</h3>
          <AssistantsTable assistants={assistants} />
        </div>
      </div>
    </div>
  );
}
