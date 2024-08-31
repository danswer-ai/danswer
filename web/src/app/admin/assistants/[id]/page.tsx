import { ErrorCallout } from "@/components/ErrorCallout";
import { AssistantEditor } from "../AssistantEditor";
import { BackButton } from "@/components/BackButton";
import { Title } from "@tremor/react";
import { DeleteAssistantButton } from "./DeleteAssistantButton";
import { fetchAssistantEditorInfoSS } from "@/lib/assistants/fetchAssistantEditorInfoSS";
import { SuccessfulAssistantUpdateRedirectType } from "../enums";
import { RobotIcon } from "@/components/icons/icons";
import { AdminPageTitle } from "@/components/admin/Title";
import { Card, CardContent } from "@/components/ui/card";

export default async function Page({ params }: { params: { id: string } }) {
  const [values, error] = await fetchAssistantEditorInfoSS(params.id);

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
            />
          </CardContent>
        </Card>

        <div className="mt-12">
          <Title>Delete Assistant</Title>
          <div className="flex mt-6">
            <DeleteAssistantButton
              assistantId={values.existingAssistant!.id}
              redirectType={SuccessfulAssistantUpdateRedirectType.ADMIN}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <div>
      <BackButton />

      <AdminPageTitle title="Edit Assistant" icon={<RobotIcon size={32} />} />

      {body}
    </div>
  );
}
