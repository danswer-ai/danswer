import { ErrorCallout } from "@/components/ErrorCallout";
import { RobotIcon } from "@/components/icons/icons";
import { BackButton } from "@/components/BackButton";
import { AdminPageTitle } from "@/components/admin/Title";
import { fetchAssistantEditorInfoSS } from "@/lib/assistants/fetchAssistantEditorInfoSS";
import { Card, CardContent } from "@/components/ui/card";
import { SuccessfulAssistantUpdateRedirectType } from "@/app/admin/assistants/enums";
import { AssistantEditor } from "@/app/admin/assistants/AssistantEditor";
import { useParams } from "next/navigation";

export default async function Page({
  params,
}: {
  params: { teamspaceId: string };
}) {
  const [values, error] = await fetchAssistantEditorInfoSS(
    undefined,
    params.teamspaceId
  );

  let body;
  if (!values) {
    body = (
      <ErrorCallout errorTitle="Something went wrong :(" errorMsg={error} />
    );
  } else {
    body = (
      <Card>
        <CardContent>
          <AssistantEditor
            {...values}
            defaultPublic={true}
            redirectType={SuccessfulAssistantUpdateRedirectType.ADMIN}
            teamspaceId={params.teamspaceId}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <BackButton />

        <AdminPageTitle
          title="Create a New Assistant"
          icon={<RobotIcon size={32} />}
        />

        {body}
      </div>
    </div>
  );
}
