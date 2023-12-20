import { getAuthDisabledSS, getCurrentUserSS } from "@/lib/userSS";
import { redirect } from "next/navigation";
import { fetchSS } from "@/lib/utilsSS";
import { Connector, DocumentSet, User, ValidSources } from "@/lib/types";
import { ChatSidebar } from "./sessionSidebar/ChatSidebar";
import { Chat } from "./Chat";
import {
  BackendMessage,
  ChatSession,
  Message,
  RetrievalType,
} from "./interfaces";
import { unstable_noStore as noStore } from "next/cache";
import { Persona } from "../admin/personas/interfaces";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { WelcomeModal } from "@/components/WelcomeModal";
import { ApiKeyModal } from "@/components/openai/ApiKeyModal";
import { cookies } from "next/headers";
import { DOCUMENT_SIDEBAR_WIDTH_COOKIE_NAME } from "@/components/resizable/contants";

export default async function ChatPage({
  chatId,
  shouldhideBeforeScroll,
}: {
  chatId: string | null;
  shouldhideBeforeScroll?: boolean;
}) {
  noStore();

  const currentChatId = chatId ? parseInt(chatId) : null;

  const tasks = [
    getAuthDisabledSS(),
    getCurrentUserSS(),
    fetchSS("/manage/connector"),
    fetchSS("/manage/document-set"),
    fetchSS("/persona?include_default=true"),
    fetchSS("/chat/get-user-chat-sessions"),
    chatId !== null
      ? fetchSS(`/chat/get-chat-session/${chatId}`)
      : (async () => null)(),
  ];

  // catch cases where the backend is completely unreachable here
  // without try / catch, will just raise an exception and the page
  // will not render
  let results: (User | Response | boolean | null)[] = [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ];
  try {
    results = await Promise.all(tasks);
  } catch (e) {
    console.log(`Some fetch failed for the main search page - ${e}`);
  }
  const authDisabled = results[0] as boolean;
  const user = results[1] as User | null;
  const connectorsResponse = results[2] as Response | null;
  const documentSetsResponse = results[3] as Response | null;
  const personasResponse = results[4] as Response | null;
  const chatSessionsResponse = results[5] as Response | null;
  const chatSessionMessagesResponse = results[6] as Response | null;

  if (!authDisabled && !user) {
    return redirect("/auth/login");
  }

  let connectors: Connector<any>[] = [];
  if (connectorsResponse?.ok) {
    connectors = await connectorsResponse.json();
  } else {
    console.log(`Failed to fetch connectors - ${connectorsResponse?.status}`);
  }
  const availableSources: ValidSources[] = [];
  connectors.forEach((connector) => {
    if (!availableSources.includes(connector.source)) {
      availableSources.push(connector.source);
    }
  });

  let chatSessions: ChatSession[] = [];
  if (chatSessionsResponse?.ok) {
    chatSessions = (await chatSessionsResponse.json()).sessions;
  } else {
    console.log(
      `Failed to fetch chat sessions - ${chatSessionsResponse?.text()}`
    );
  }
  // Larger ID -> created later
  chatSessions.sort((a, b) => (a.id > b.id ? -1 : 1));
  const currentChatSession = chatSessions.find(
    (chatSession) => chatSession.id === currentChatId
  );

  let documentSets: DocumentSet[] = [];
  if (documentSetsResponse?.ok) {
    documentSets = await documentSetsResponse.json();
  } else {
    console.log(
      `Failed to fetch document sets - ${documentSetsResponse?.status}`
    );
  }

  let personas: Persona[] = [];
  if (personasResponse?.ok) {
    personas = await personasResponse.json();
  } else {
    console.log(`Failed to fetch personas - ${personasResponse?.status}`);
  }

  let messages: Message[] = [];
  if (chatSessionMessagesResponse?.ok) {
    const chatSessionDetailJson = await chatSessionMessagesResponse.json();
    const rawMessages = chatSessionDetailJson.messages as BackendMessage[];
    const messageMap: Map<number, BackendMessage> = new Map(
      rawMessages.map((message) => [message.message_id, message])
    );

    const rootMessage = rawMessages.find(
      (message) => message.parent_message === null
    );

    const finalMessageList: BackendMessage[] = [];
    if (rootMessage) {
      let currMessage: BackendMessage | null = rootMessage;
      while (currMessage) {
        finalMessageList.push(currMessage);
        const childMessageNumber = currMessage.latest_child_message;
        if (childMessageNumber && messageMap.has(childMessageNumber)) {
          currMessage = messageMap.get(childMessageNumber) as BackendMessage;
        } else {
          currMessage = null;
        }
      }
    }

    messages = finalMessageList
      .filter((messageInfo) => messageInfo.message_type !== "system")
      .map((messageInfo) => {
        const hasContextDocs =
          (messageInfo?.context_docs?.top_documents || []).length > 0;
        let retrievalType;
        if (hasContextDocs) {
          if (messageInfo.rephrased_query) {
            retrievalType = RetrievalType.Search;
          } else {
            retrievalType = RetrievalType.SelectedDocs;
          }
        } else {
          retrievalType = RetrievalType.None;
        }

        return {
          messageId: messageInfo.message_id,
          message: messageInfo.message,
          type: messageInfo.message_type as "user" | "assistant",
          // only include these fields if this is an assistant message so that
          // this is identical to what is computed at streaming time
          ...(messageInfo.message_type === "assistant"
            ? {
                retrievalType: retrievalType,
                query: messageInfo.rephrased_query,
                documents: messageInfo?.context_docs?.top_documents || [],
                citations: messageInfo?.citations || {},
              }
            : {}),
        };
      });
  } else {
    console.log(
      `Failed to fetch chat session messages - ${chatSessionMessagesResponse?.text()}`
    );
  }

  const documentSidebarCookieInitialWidth = cookies().get(
    DOCUMENT_SIDEBAR_WIDTH_COOKIE_NAME
  );
  const finalDocumentSidebarInitialWidth = documentSidebarCookieInitialWidth
    ? parseInt(documentSidebarCookieInitialWidth.value)
    : undefined;

  return (
    <>
      <InstantSSRAutoRefresh />
      <ApiKeyModal />

      {connectors.length === 0 && connectorsResponse?.ok && <WelcomeModal />}

      <div className="flex relative bg-background text-default h-screen overflow-x-hidden">
        <ChatSidebar
          existingChats={chatSessions}
          currentChatId={currentChatId}
          user={user}
        />

        <Chat
          existingChatSessionId={currentChatId}
          existingChatSessionPersonaId={currentChatSession?.persona_id}
          existingMessages={messages}
          availableSources={availableSources}
          availableDocumentSets={documentSets}
          availablePersonas={personas}
          documentSidebarInitialWidth={finalDocumentSidebarInitialWidth}
          shouldhideBeforeScroll={shouldhideBeforeScroll}
        />
      </div>
    </>
  );
}
