import { ChatSidebar } from "@/app/chat/sessionSidebar/ChatSidebar";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { UserDropdown } from "@/components/UserDropdown";
import { ChatProvider } from "@/components/context/ChatContext";
import { WelcomeModal } from "@/components/initialSetup/welcome/WelcomeModalWrapper";
import { ApiKeyModal } from "@/components/llm/ApiKeyModal";
import { fetchChatData } from "@/lib/chat/fetchChatData";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { AssistantsList } from "./AssistantsList";
import { DynamicSidebar } from "@/components/DynamicSidebar";
import { AssistantsBars } from "./AssistantsBars";

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
    personas,
    tags,
    llmProviders,
    folders,
    openedFolders,
    shouldShowWelcomeModal,
  } = data;

  return (
    <>
      <InstantSSRAutoRefresh />

      {shouldShowWelcomeModal && <WelcomeModal user={user} />}

      <ChatProvider
        value={{
          user,
          chatSessions,
          availableSources,
          availableDocumentSets: documentSets,
          availablePersonas: personas,
          availableTags: tags,
          llmProviders,
          folders,
          openedFolders,
        }}
      >
        <div className="relative flex h-screen overflow-x-hidden bg-background">
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
            <AssistantsList user={user} assistants={personas} />
          </div>
        </div>
      </ChatProvider>
    </>
  );
}
