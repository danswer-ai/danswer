import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { ChatProvider } from "@/context/ChatContext";
import { WelcomeModal } from "@/components/initialSetup/welcome/WelcomeModalWrapper";
import { fetchChatData } from "@/lib/chat/fetchChatData";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { AssistantsList } from "./AssistantsList";
import { DynamicSidebar } from "@/components/DynamicSidebar";
import { AssistantsBars } from "./AssistantsBars";
import { ChatSidebar } from "@/app/chat/sessionSidebar/ChatSidebar";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: { [key: string]: string };
}) {
  noStore();

  const data = await fetchChatData(searchParams);

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
    userInputPrompts,
  } = data;

  return (
    <>
      {shouldShowWelcomeModal && <WelcomeModal user={user} />}

      <ChatProvider
        value={{
          chatSessions,
          availableSources,
          availableDocumentSets: documentSets,
          availableTags: tags,
          llmProviders,
          folders,
          openedFolders,
          userInputPrompts,
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
            <AssistantsList user={user} assistants={assistants} />
          </div>
        </div>
      </ChatProvider>
    </>
  );
}
