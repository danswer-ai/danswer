import { ToolsTable } from "./ToolsTable";
import { ToolSnapshot } from "@/lib/tools/interfaces";
import Link from "next/link";
import { Divider } from "@tremor/react";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { AdminPageTitle } from "@/components/admin/Title";
import { Button } from "@/components/ui/button";
import { SquarePlus, Wrench } from "lucide-react";

export default async function Page() {
  const toolResponse = await fetchSS("/tool");

  if (!toolResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch tools - ${await toolResponse.text()}`}
      />
    );
  }

  const tools = (await toolResponse.json()) as ToolSnapshot[];

  return (
    <div className="py-24 md:py-32 lg:pt-16">
      <AdminPageTitle
        icon={<Wrench size={32} className="my-auto" />}
        title="Tools"
      />

      <p className="mb-2">
        Tools allow assistants to retrieve information or take actions.
      </p>

      <div className="pt-5">
        <h3 className="font-semibold pb-2">Create a Tool</h3>
        <Link href="/admin/tools/new">
          <Button className="mt-2">
            <SquarePlus size={14} />
            New Tool
          </Button>
        </Link>

        <Divider />

        <h3 className="font-semibold pb-5">Existing Tools</h3>
        <ToolsTable tools={tools} />
      </div>
    </div>
  );
}
