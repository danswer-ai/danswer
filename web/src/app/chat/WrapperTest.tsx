"use client";

import { ChatPage } from "./ChatPage";
import FunctionalWrapper from "./shared_chat_search/FunctionalWrapper";

export default function WrapperTest({
  defaultPersonaId,
  finalDocumentSidebarInitialWidth,
  toggleChatSidebar,
}: {
  defaultPersonaId?: number;
  finalDocumentSidebarInitialWidth?: number;
  toggleChatSidebar?: boolean | undefined;
}) {
  return (
    <FunctionalWrapper
      initiallyTogggled={toggleChatSidebar!}
      content={(toggle) => (
        <ChatPage
          toggle={toggle}
          defaultSelectedPersonaId={defaultPersonaId}
          documentSidebarInitialWidth={finalDocumentSidebarInitialWidth}
          toggleChatSidebar={toggleChatSidebar}
        />
      )}
    />
  );
}
