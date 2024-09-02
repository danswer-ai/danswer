import { ErrorCallout } from "@/components/ErrorCallout";
import { Text, Title } from "@tremor/react";
import { HeaderWrapper } from "@/components/header/HeaderWrapper";
import { AssistantEditor } from "@/app/admin/assistants/AssistantEditor";
import { SuccessfulAssistantUpdateRedirectType } from "@/app/admin/assistants/enums";
import { fetchAssistantEditorInfoSS } from "@/lib/assistants/fetchAssistantEditorInfoSS";
import { DeleteAssistantButton } from "@/app/admin/assistants/[id]/DeleteAssistantButton";
import { LargeBackButton } from "../../LargeBackButton";
import { Card, CardContent } from "@/components/ui/card";

export default async function Page({ params }: { params: { id: string } }) {
  const [values, error] = await fetchAssistantEditorInfoSS(params.id);

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
          <div className="mx-auto container">
            <Card>
              <CardContent>
                <AssistantEditor
                  {...values}
                  defaultPublic={false}
                  redirectType={SuccessfulAssistantUpdateRedirectType.CHAT}
                />
              </CardContent>
            </Card>

            <Title className="mt-12">Delete Assistant</Title>
            <Text>
              Click the button below to permanently delete this assistant.
            </Text>
            <div className="flex mt-6">
              <DeleteAssistantButton
                assistantId={values.existingAssistant!.id}
                redirectType={SuccessfulAssistantUpdateRedirectType.CHAT}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <HeaderWrapper>
        <div className="h-full flex flex-col">
          <div className="flex my-auto">
            <LargeBackButton />
            <h1 className="flex text-xl text-strong font-bold my-auto">
              Edit Assistant
            </h1>
          </div>
        </div>
      </HeaderWrapper>

      {body}
    </div>
  );
}
