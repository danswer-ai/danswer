import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { WelcomeModal } from "@/components/initialSetup/welcome/WelcomeModalWrapper";
import { ApiKeyModal } from "@/components/llm/ApiKeyModal";
import { NoCompleteSourcesModal } from "@/components/initialSetup/search/NoCompleteSourceModal";
import { ChatProvider } from "@/components/context/ChatContext";
import { fetchChatData } from "@/lib/chat/fetchChatData";
import FunctionalWrapper from "./shared_chat_search/FunctionalWrapper";
import { ChatPage } from "./ChatPage";
import WrappedChat from "./WrappedChat";

export default async function Page({
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
    ccPairs,
    availableSources,
    documentSets,
    assistants,
    tags,
    llmProviders,
    folders,
    toggleSidebar,
    openedFolders,
    defaultAssistantId,
    finalDocumentSidebarInitialWidth,
    shouldShowWelcomeModal,
    shouldDisplaySourcesIncompleteModal,
    userInputPrompts,
  } = data;

  return (
    <>
      <InstantSSRAutoRefresh />
      {shouldShowWelcomeModal && <WelcomeModal user={user} />}
      {!shouldShowWelcomeModal && !shouldDisplaySourcesIncompleteModal && (
        <ApiKeyModal user={user} />
      )}
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
          userInputPrompts,
        }}
      >
        <WrappedChat
          defaultAssistantId={defaultAssistantId}
          initiallyToggled={toggleSidebar}
        />
      </ChatProvider>
    </>
  );
}
