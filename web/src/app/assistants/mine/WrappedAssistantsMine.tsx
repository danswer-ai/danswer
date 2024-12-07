"use client";
import { AssistantsList } from "./AssistantsList";
import SidebarWrapper from "../SidebarWrapper";
import { ChatSession } from "@/app/chat/interfaces";

export default function WrappedAssistantsMine({
  chatSessions,
  initiallyToggled,
}: {
  chatSessions: ChatSession[];
  initiallyToggled: boolean;
}) {
  return (
    <SidebarWrapper
      page="chat"
      initiallyToggled={initiallyToggled}
      chatSessions={chatSessions}
    >
      <AssistantsList />
    </SidebarWrapper>
  );
}
