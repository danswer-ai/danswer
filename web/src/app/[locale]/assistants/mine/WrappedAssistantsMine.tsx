"use client";
import { AssistantsList } from "./AssistantsList";
import SidebarWrapper from "../SidebarWrapper";
import { ChatSession } from "@/app/[locale]/chat/interfaces";
import { Folder } from "@/app/[locale]/chat/folders/interfaces";

export default function WrappedAssistantsMine({
  chatSessions,
  initiallyToggled,
  folders,
  openedFolders,
}: {
  chatSessions: ChatSession[];
  folders: Folder[];
  initiallyToggled: boolean;
  openedFolders?: { [key: number]: boolean };
}) {
  return (
    <SidebarWrapper
      page="chat"
      initiallyToggled={initiallyToggled}
      chatSessions={chatSessions}
      folders={folders}
      openedFolders={openedFolders}
    >
      <AssistantsList />
    </SidebarWrapper>
  );
}
