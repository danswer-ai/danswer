"use client";

import SidebarWrapper from "../SidebarWrapper";
import { ChatSession } from "@/app/chat/interfaces";
import { AssistantsGallery } from "./AssistantsGallery";

export default function WrappedAssistantsGallery({
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
      <AssistantsGallery />
    </SidebarWrapper>
  );
}
