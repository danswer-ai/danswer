"use client";

import { useState } from "react";
import { ChatPage } from "./ChatPage";
import FunctionalWrapper from "./shared_chat_search/FunctionalWrapper";

export default function WrapperTest({
  defaultPersonaId,
  toggleSidebar,
}: {
  defaultPersonaId?: number;
  toggleSidebar: boolean | undefined;
}) {
  const [toggledSidebar, setToggledSidebar] = useState<boolean>(
    toggleSidebar || false
  );
  const toggle = () => {
    setToggledSidebar((toggledSidebar) => !toggledSidebar);
  };

  return (
    <FunctionalWrapper toggledSidebar={toggledSidebar}>
      <ChatPage
        toggle={toggle}
        defaultSelectedPersonaId={defaultPersonaId}
        toggledSidebar={toggledSidebar}
      />
    </FunctionalWrapper>
  );
}
