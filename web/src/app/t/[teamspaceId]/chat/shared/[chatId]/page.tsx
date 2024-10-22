import { User } from "@/lib/types";
import {
  AuthTypeMetadata,
  getAuthTypeMetadataSS,
  getCurrentTeamspaceUserSS,
  getCurrentUserSS,
} from "@/lib/userSS";
import { fetchSS } from "@/lib/utilsSS";
import { redirect } from "next/navigation";
import { BackendChatSession } from "../../interfaces";
import { SharedChatDisplay } from "./SharedChatDisplay";
import { fetchChatData } from "@/lib/chat/fetchChatData";
import { ChatProvider } from "@/context/ChatContext";
import { Assistant } from "@/app/admin/assistants/interfaces";

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

export default async function Page({
  params,
}: {
  params: { chatId: string; teamspaceId: string };
}) {
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
  } = data;

  const tasks = [
    getAuthTypeMetadataSS(),
    getCurrentUserSS(),
    getSharedChat(params.chatId),
    getCurrentTeamspaceUserSS(params.teamspaceId),
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
  const user = params.teamspaceId
    ? (results[1] as User | null)
    : (results[3] as User | null);
  const chatSession = results[2] as BackendChatSession | null;
  const availableAssistants = results[4] as Assistant[] | null;

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
      <div className="flex relative bg-background overflow-hidden h-full">
        <SharedChatDisplay
          chatSession={chatSession}
          availableAssistants={availableAssistants}
        />
      </div>
    </ChatProvider>
  );
}
