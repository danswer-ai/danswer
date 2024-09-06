import { ChatSidebar } from "@/app/chat/sessionSidebar/ChatSidebar";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { UserDropdown } from "@/components/UserDropdown";
import { ChatProvider } from "@/components/context/ChatContext";
import { WelcomeModal } from "@/components/initialSetup/welcome/WelcomeModalWrapper";
import { fetchChatData } from "@/lib/chat/fetchChatData";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { AssistantsGallery } from "./AssistantsGallery";
import { AssistantsBars } from "../mine/AssistantsBars";

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
          availableAssistants: assistants,
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
            <AssistantsGallery assistants={assistants} user={user} />
          </div>
        </div>
      </ChatProvider>
    </>
  );
}
