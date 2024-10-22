"use client";

import React, { useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const PageSwitcher: React.FC = () => {
  const { teamspaceId } = useParams();

  useKeyboardShortcuts([
    {
      key: "s",
      handler: () => {
        window.location.href = teamspaceId
          ? `/t/${teamspaceId}/search`
          : "/search";
      },
      ctrlKey: true,
    },
    {
      key: "d",
      handler: () => {
        window.location.href = teamspaceId ? `/t/${teamspaceId}/chat` : "/chat";
      },
      ctrlKey: true,
    },
    {
      key: "p",
      handler: () => {
        window.location.href = "/profile";
      },
      ctrlKey: true,
    },
    {
      key: "q",
      handler: () => {
        window.location.href = teamspaceId
          ? `/t/${teamspaceId}/admin/indexing/status`
          : "/admin/indexing/status";
      },
      ctrlKey: true,
    },
  ]);

  return <div />;
};

export default PageSwitcher;
