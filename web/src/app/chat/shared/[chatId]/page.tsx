import { User } from "@/lib/types";
import {
  AuthTypeMetadata,
  getAuthTypeMetadataSS,
  getCurrentUserSS,
} from "@/lib/userSS";
import { fetchSS } from "@/lib/utilsSS";
import { redirect } from "next/navigation";
import { BackendChatSession } from "../../interfaces";
import { SharedChatDisplay } from "./SharedChatDisplay";
import { fetchChatData } from "@/lib/chat/fetchChatData";
import { ChatProvider } from "@/context/ChatContext";
import { Assistant } from "@/app/admin/assistants/interfaces";
import { fetchAssistantsSS } from "@/lib/assistants/fetchAssistantsSS";

async function getSharedChat(chatId: string) {
  const response = await fetchSS(
    `/chat/get-chat-session/${chatId}?is_shared=True`
  );
  if (response.ok) {
    return await response.json();
  }
  return null;
}

async function fetchSharedChatSession(sessionId: number) {
  const response = await fetch(
    `/chat/get-chat-session/${sessionId}?is_shared=true`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch the shared chat session.");
  }
  return response.json();
}

export default async function Page({ params }: { params: { chatId: string } }) {
  const data = await fetchChatData(params);

  if ("redirect" in data) {
    redirect(data.redirect);
  }

  const {
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

  const tasks = [
    getAuthTypeMetadataSS(),
    getCurrentUserSS(),
    getSharedChat(params.chatId),
    fetchAssistantsSS(),
  ];

  // catch cases where the backend is completely unreachable here
  // without try / catch, will just raise an exception and the page
  // will not render
  let results: (
    | User
    | AuthTypeMetadata
    | [Assistant[], string | null]
    | null
  )[] = [null, null, null];
  try {
    results = await Promise.all(tasks);
  } catch (e) {
    console.log(`Some fetch failed for the main search page - ${e}`);
  }
  const authTypeMetadata = results[0] as AuthTypeMetadata | null;
  const user = results[1] as User | null;
  const chatSession = results[2] as BackendChatSession | null;
  const [availableAssistants, _] = results[3] as [Assistant[], string | null];

  const authDisabled = authTypeMetadata?.authType === "disabled";
  if (!authDisabled && !user) {
    return redirect("/auth/login");
  }

  if (user && !user.is_verified && authTypeMetadata?.requiresVerification) {
    return redirect("/auth/waiting-on-verification");
  }

  return (
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
      <div className="flex relative bg-background overflow-hidden h-full">
        <SharedChatDisplay
          chatSession={chatSession}
          availableAssistants={availableAssistants}
        />
      </div>
    </ChatProvider>
  );
}
