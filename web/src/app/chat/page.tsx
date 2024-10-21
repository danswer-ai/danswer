import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { WelcomeModal } from "@/components/initialSetup/welcome/WelcomeModalWrapper";
import { ChatProvider } from "@/components/context/ChatContext";
import { fetchChatData } from "@/lib/chat/fetchChatData";
import WrappedChat from "./WrappedChat";
import { AssistantsProvider } from "@/components/context/AssistantsContext";

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
    availableSources,
    documentSets,
    tags,
    llmProviders,
    folders,
    toggleSidebar,
    openedFolders,
    defaultAssistantId,
    shouldShowWelcomeModal,
    assistants,
    userInputPrompts,
    hasAnyConnectors,
    hasImageCompatibleModel,
  } = data;

  return (
    <>
      <InstantSSRAutoRefresh />
      {shouldShowWelcomeModal && <WelcomeModal user={user} />}
      <AssistantsProvider
        initialAssistants={assistants}
        hasAnyConnectors={hasAnyConnectors}
        hasImageCompatibleModel={hasImageCompatibleModel}
      >
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
            shouldShowWelcomeModal,
            defaultAssistantId,
          }}
        >
          <WrappedChat initiallyToggled={toggleSidebar} />
        </ChatProvider>
      </AssistantsProvider>
    </>
  );
}
