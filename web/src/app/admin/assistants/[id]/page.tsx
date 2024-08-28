import { ErrorCallout } from "@/components/ErrorCallout";
import { AssistantEditor } from "../AssistantEditor";
import { BackButton } from "@/components/BackButton";
import { Title } from "@tremor/react";
import { DeletePersonaButton } from "./DeletePersonaButton";
import { fetchAssistantEditorInfoSS } from "@/lib/assistants/fetchPersonaEditorInfoSS";
import { SuccessfulPersonaUpdateRedirectType } from "../enums";
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
              redirectType={SuccessfulPersonaUpdateRedirectType.ADMIN}
            />
          </CardContent>
        </Card>

        <div className="mt-12">
          <Title>Delete Assistant</Title>
          <div className="flex mt-6">
            <DeletePersonaButton
              personaId={values.existingPersona!.id}
              redirectType={SuccessfulPersonaUpdateRedirectType.ADMIN}
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
