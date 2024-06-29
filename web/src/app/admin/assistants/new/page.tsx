import { AssistantEditor } from "@/components/adminPageComponents/assistants/AdminAssistantsEditor";
import { ErrorCallout } from "@/components/ErrorCallout";
import { RobotIcon } from "@/components/icons/icons";
import { BackButton } from "@/components/BackButton";
import { Card } from "@tremor/react";
import { AdminPageTitle } from "@/components/adminPageComponents/Title";
import { fetchAssistantEditorInfoSS } from "@/lib/assistants/fetchPersonaEditorInfoSS";
import { SuccessfulPersonaUpdateRedirectType } from "../enums";

export default async function Page() {
  const [values, error] = await fetchAssistantEditorInfoSS();

  return (
    <div>
      <BackButton />

      <AdminPageTitle
        title="Create a New Persona"
        icon={<RobotIcon size={32} />}
      />
      {!values && error && (<ErrorCallout errorTitle="Something went wrong :(" errorMsg={error} />)}
      {values && (      
        <Card>
          <AssistantEditor
            {...values}
            defaultPublic={true}
            redirectType={SuccessfulPersonaUpdateRedirectType.ADMIN}
          />
        </Card>)}
    </div>
  );
}
