import { ErrorCallout } from "@/components/ErrorCallout";
import { AssistantEditor } from "@/components/adminPageComponents/assistants/AdminAssistantsEditor";
import { BackButton } from "@/components/BackButton";
import { Card, Title } from "@tremor/react";
import { DeletePersonaButton } from "@/components/adminPageComponents/assistants/AdminAssistantsDeletePersonaButton";
import { fetchAssistantEditorInfoSS } from "@/lib/assistants/fetchPersonaEditorInfoSS";
import { SuccessfulPersonaUpdateRedirectType } from "../enums";
import { RobotIcon } from "@/components/icons/icons";
import { AdminPageTitle } from "@/components/adminPageComponents/Title";

export default async function Page({ params }: { params: { id: string } }) {
  const [values, error] = await fetchAssistantEditorInfoSS(params.id);

  return (
    <div>
      <BackButton />

      <AdminPageTitle title="Edit Assistant" icon={<RobotIcon size={32} />} />
      {!values && error && (<ErrorCallout errorTitle="Something went wrong :(" errorMsg={error} />)}
      {values && (<>
        <Card>
          <AssistantEditor
            {...values}
            defaultPublic={true}
            redirectType={SuccessfulPersonaUpdateRedirectType.ADMIN}
          />
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
      </>)}
    </div>
  );
}
