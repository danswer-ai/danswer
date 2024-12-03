"use client";

import { ChatSession } from "@/app/chat/interfaces";
import { Folder } from "@/app/chat/folders/interfaces";
import { User } from "@/lib/types";

import { useInputPrompts } from "@/app/admin/prompt-library/hooks";
import { PromptSection } from "@/app/admin/prompt-library/promptSection";
import { AssistantsPageTitle } from "../assistants/AssistantsPageTitle";
import SidebarWrapper from "../assistants/SidebarWrapper";
import MyDocumentsPage from "./MyDocuments";

export default function WrappedUserDocuments({
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
  const {
    data: promptLibrary,
    error: promptLibraryError,
    isLoading: promptLibraryIsLoading,
    refreshInputPrompts: refreshPrompts,
  } = useInputPrompts(false);

  return (
    <SidebarWrapper
      size="lg"
      page="chat"
      initiallyToggled={initiallyToggled}
      chatSessions={chatSessions}
      folders={folders}
      openedFolders={openedFolders}
    >
      <div className="mx-auto w-searchbar-xs 2xl:w-searchbar-sm 3xl:w-searchbar">
        <AssistantsPageTitle>My Documents</AssistantsPageTitle>
        <MyDocumentsPage />
      </div>
    </SidebarWrapper>
  );
}
