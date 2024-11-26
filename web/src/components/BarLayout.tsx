"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { User } from "@/lib/types";
import { DynamicSidebar } from "@/components/DynamicSidebar";
import { TopBar } from "./TopBar";

interface BarLayoutProps {
  user?: User | null;
  BarComponent?: React.ComponentType<{
    openSidebar: boolean;
    toggleSideBar: () => void;
    teamspaceId?: string | string;
  }>;
  teamspaceId?: string | string;
}

export function BarLayout({ user, BarComponent, teamspaceId }: BarLayoutProps) {
  const [openSidebar, setOpenSidebar] = useState(false);
  const pathname = usePathname();

  const toggleLeftSideBar = () => {
    setOpenSidebar((prevState) => !prevState);
  };

  useEffect(() => {
    setOpenSidebar(false);
  }, [pathname]);

  return (
    <>
      <TopBar toggleLeftSideBar={toggleLeftSideBar} />
      <DynamicSidebar
        user={user}
        openSidebar={openSidebar}
        toggleLeftSideBar={toggleLeftSideBar}
      >
        {BarComponent && (
          <BarComponent
            openSidebar={openSidebar}
            toggleSideBar={toggleLeftSideBar}
            teamspaceId={teamspaceId}
          />
        )}
      </DynamicSidebar>
    </>
  );
}
