"use client";

import { useState } from "react";
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
  const [toggledSidebar, setToggledSidebar] = useState<boolean>(
    toggleChatSidebar || false
  );
  const toggle = () => {
    setToggledSidebar((toggledSidebar) => !toggledSidebar);
  };

  return (
    <FunctionalWrapper toggledSidebar={toggledSidebar}>
      <ChatPage
        toggle={toggle}
        defaultSelectedPersonaId={defaultPersonaId}
        documentSidebarInitialWidth={finalDocumentSidebarInitialWidth}
        toggledSidebar={toggledSidebar}
      />
    </FunctionalWrapper>
  );
}
