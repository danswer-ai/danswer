"use client";

import { useSearchParams } from "next/navigation";
import { ChatSession } from "./interfaces";
import { ChatSidebar } from "./sessionSidebar/ChatSidebar";
import { Chat } from "./Chat";
import { DocumentSet, User, ValidSources } from "@/lib/types";
import { Persona } from "../admin/personas/interfaces";

export function ChatLayout({
  user,
  chatSessions,
  availableSources,
  availableDocumentSets,
  availablePersonas,
  defaultSelectedPersonaId,
  documentSidebarInitialWidth,
}: {
  user: User | null;
  chatSessions: ChatSession[];
  availableSources: ValidSources[];
  availableDocumentSets: DocumentSet[];
  availablePersonas: Persona[];
  defaultSelectedPersonaId?: number; // what persona to default to
  documentSidebarInitialWidth?: number;
}) {
  const searchParams = useSearchParams();
  const chatIdRaw = searchParams.get("chatId");
  const chatId = chatIdRaw ? parseInt(chatIdRaw) : null;

  const selectedChatSession = chatSessions.find(
    (chatSession) => chatSession.id === chatId
  );

  return (
    <>
      <div className="flex relative bg-background text-default h-screen overflow-x-hidden">
        <ChatSidebar
          existingChats={chatSessions}
          currentChatId={chatId}
          user={user}
        />

        <Chat
          existingChatSessionId={chatId}
          existingChatSessionPersonaId={selectedChatSession?.persona_id}
          availableSources={availableSources}
          availableDocumentSets={availableDocumentSets}
          availablePersonas={availablePersonas}
          defaultSelectedPersonaId={defaultSelectedPersonaId}
          documentSidebarInitialWidth={documentSidebarInitialWidth}
        />
      </div>
    </>
  );
}
