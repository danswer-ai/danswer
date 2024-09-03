import { HeaderWrapper } from "@/components/header/HeaderWrapper";
import { AssistantEditor } from "@/app/admin/assistants/AssistantEditor";
import { SuccessfulAssistantUpdateRedirectType } from "@/app/admin/assistants/enums";
import { fetchAssistantEditorInfoSS } from "@/lib/assistants/fetchAssistantEditorInfoSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { LargeBackButton } from "../LargeBackButton";
import { Card, CardContent } from "@/components/ui/card";

export default async function Page() {
  const [values, error] = await fetchAssistantEditorInfoSS();

  let body;
  if (!values) {
    body = (
      <div className="px-32">
        <ErrorCallout errorTitle="Something went wrong :(" errorMsg={error} />
      </div>
    );
  } else {
    body = (
      <div className="w-full my-16">
        <div className="px-32">
          <div className="container mx-auto py-24 md:py-32 lg:pt-16">
            <Card>
              <CardContent>
                <AssistantEditor
                  {...values}
                  defaultPublic={false}
                  redirectType={SuccessfulAssistantUpdateRedirectType.CHAT}
                  shouldAddAssistantToUserPreferences={true}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <HeaderWrapper>
        <div className="flex flex-col h-full">
          <div className="flex my-auto">
            <LargeBackButton />
            <h1 className="flex my-auto text-xl font-bold text-strong">
              New Assistant
            </h1>
          </div>
        </div>
      </HeaderWrapper>

      {body}
    </div>
  );
}
