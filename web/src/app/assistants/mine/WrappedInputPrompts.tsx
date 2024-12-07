"use client";
import SidebarWrapper from "../SidebarWrapper";
import { ChatSession } from "@/app/chat/interfaces";

import { AssistantsPageTitle } from "../AssistantsPageTitle";
import { useInputPrompts } from "@/app/admin/prompt-library/hooks";
import { PromptSection } from "@/app/admin/prompt-library/promptSection";

export default function WrappedPrompts({
  chatSessions,
  initiallyToggled,
}: {
  chatSessions: ChatSession[];
  initiallyToggled: boolean;
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
    >
      <div className="mx-auto w-searchbar-xs 2xl:w-searchbar-sm 3xl:w-searchbar">
        <AssistantsPageTitle>Prompt Gallery</AssistantsPageTitle>
        <PromptSection
          promptLibrary={promptLibrary || []}
          isLoading={promptLibraryIsLoading}
          error={promptLibraryError}
          refreshPrompts={refreshPrompts}
          isPublic={false}
          centering
        />
      </div>
    </SidebarWrapper>
  );
}
