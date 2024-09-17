import { ErrorCallout } from "@/components/ErrorCallout";
import { Text, Title } from "@tremor/react";
import { ToolEditor } from "@/app/admin/tools/ToolEditor";
import { fetchToolByIdSS } from "@/lib/tools/fetchTools";
import { DeleteToolButton } from "./DeleteToolButton";
import { FiTool } from "react-icons/fi";
import { AdminPageTitle } from "@/components/admin/Title";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent } from "@/components/ui/card";

export default async function Page({ params }: { params: { toolId: string } }) {
  const tool = await fetchToolByIdSS(params.toolId);

  let body;
  if (!tool) {
    body = (
      <div>
        <ErrorCallout
          errorTitle="Something went wrong :("
          errorMsg="Tool not found"
        />
      </div>
    );
  } else {
    body = (
      <div className="w-full">
        <div>
          <div>
            <Card>
              <CardContent>
                <ToolEditor tool={tool} />
              </CardContent>
            </Card>

            <h3 className="mt-10">Delete Tool</h3>
            <p className="text-sm text-subtle">
              Click the button below to permanently delete this tool.
            </p>
            <div className="flex mt-6">
              <DeleteToolButton toolId={tool.id} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-24 md:py-32 lg:pt-16">
      <BackButton />

      <AdminPageTitle
        title="Edit Tool"
        icon={<FiTool size={32} className="my-auto" />}
      />

      {body}
    </div>
  );
}
