import { ErrorCallout } from "@/components/ErrorCallout";
import { BackButton } from "@/components/BackButton";
import { fetchAssistantEditorInfoSS } from "@/lib/assistants/fetchAssistantEditorInfoSS";
import { RobotIcon } from "@/components/icons/icons";
import { AdminPageTitle } from "@/components/admin/Title";
import { Card, CardContent } from "@/components/ui/card";
import { AssistantEditor } from "@/app/admin/assistants/AssistantEditor";
import { SuccessfulAssistantUpdateRedirectType } from "@/app/admin/assistants/enums";
import { DeleteAssistantButton } from "@/app/admin/assistants/[id]/DeleteAssistantButton";

export default async function Page({ params }: { params: { id: string, teamspaceId: string } }) {
  const [values, error] = await fetchAssistantEditorInfoSS(params.id, params.teamspaceId);

  let body;
  if (!values) {
    body = (
      <ErrorCallout errorTitle="Something went wrong :(" errorMsg={error} />
    );
  } else {
    body = (
      <>
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

        <div className="mt-12">
          <DeleteAssistantButton
            assistantId={values.existingAssistant!.id}
            redirectType={SuccessfulAssistantUpdateRedirectType.ADMIN}
          />
        </div>
      </>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="container">
        <BackButton />

        <AdminPageTitle title="Edit Assistant" icon={<RobotIcon size={32} />} />

        {body}
      </div>
    </div>
  );
}
