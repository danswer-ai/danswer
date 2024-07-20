"use client";

import { ChatSession } from "@/app/chat/interfaces";
import { User } from "@/lib/types";
import SidebarWrapper from "@/app/assistants/SidebarWrapper";
import SlackPage from "./SlackPage";
import { useState } from "react";

export default function WrappedSlackPage({
  initiallyToggled,
  user,
}: {
  initiallyToggled: boolean;
  user: User | null;
}) {
  const [index, setIndex] = useState(1);

  const increment = () => {
    setIndex((index) => index + 1);
  };
  const decrement = () => {
    setIndex((index) => index - 1);
  };

  return (
    <SidebarWrapper
      adminSetupProps={{
        steps: ["Credentials", "Channel", "Finalize"],
        index: index - 1,
        max_index: index - 1,
      }}
      page="admin"
      initiallyToggled={initiallyToggled}
      headerProps={{ user, page: "admin" }}
      contentProps={{
        index,
        increment,
        decrement,
      }}
      content={(contentProps) => (
        <SlackPage
          index={contentProps.index}
          decrement={contentProps.decrement}
          increment={contentProps.increment}
        />
      )}
    />
  );
}
