import { ErrorCallout } from "@/components/ErrorCallout";
import { Text, Title } from "@tremor/react";
import { HeaderWrapper } from "@/components/header/HeaderWrapper";
import { AssistantEditor } from "@/app/admin/assistants/AssistantEditor";
import { SuccessfulAssistantUpdateRedirectType } from "@/app/admin/assistants/enums";
import { fetchAssistantEditorInfoSS } from "@/lib/assistants/fetchAssistantEditorInfoSS";
import { DeleteAssistantButton } from "@/app/admin/assistants/[id]/DeleteAssistantButton";
import { LargeBackButton } from "../../LargeBackButton";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { unstable_noStore as noStore } from "next/cache";
import { fetchChatData } from "@/lib/chat/fetchChatData";
import { redirect } from "next/navigation";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { ChatProvider } from "@/context/ChatContext";
import { AssistantsBars } from "../../mine/AssistantsBars";
import { ChatSidebar } from "@/app/chat/sessionSidebar/ChatSidebar";

export default async function Page({ params }: { params: { id: string } }) {
  const [values, error] = await fetchAssistantEditorInfoSS(params.id);

  noStore();

  const data = await fetchChatData(params);

  if ("redirect" in data) {
    redirect(data.redirect);
  }

  const {
    user,
    chatSessions,
    availableSources,
    documentSets,
    assistants,
    tags,
    llmProviders,
    folders,
    openedFolders,
    shouldShowWelcomeModal,
  } = data;

  let body;
  if (!values) {
    body = (
      <div className="px-32">
        <ErrorCallout errorTitle="Something went wrong :(" errorMsg={error} />
      </div>
    );
  } else {
    body = (
      <div className="w-full">
        <div className="px-32">
          <BackButton />
          <div className="py-24 md:py-32 lg:py-16 lg:pt-10">
            <Card>
              <CardContent>
                <AssistantEditor
                  {...values}
                  defaultPublic={false}
                  redirectType={SuccessfulAssistantUpdateRedirectType.CHAT}
                />
              </CardContent>
            </Card>

            <h3 className="mt-12">Delete Assistant</h3>
            <p className="text-sm text-subtle">
              Click the button below to permanently delete this assistant.
            </p>
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
    <>
      <InstantSSRAutoRefresh />

      <ChatProvider
        value={{
          user,
          chatSessions,
          availableSources,
          availableDocumentSets: documentSets,
          availableAssistants: assistants,
          availableTags: tags,
          llmProviders,
          folders,
          openedFolders,
        }}
      >
        <div className="relative flex h-full overflow-x-hidden bg-background">
          <AssistantsBars user={user}>
            <ChatSidebar
              existingChats={chatSessions}
              currentChatSession={null}
              folders={folders}
              openedFolders={openedFolders}
              isAssistant
            />
          </AssistantsBars>

          <div
            className={`w-full h-full flex flex-col overflow-y-auto overflow-x-hidden relative pt-24 px-4 2xl:pt-10`}
          >
            {body}
          </div>
        </div>
      </ChatProvider>
    </>
  );
}
