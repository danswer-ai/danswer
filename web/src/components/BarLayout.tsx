"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { User } from "@/lib/types";
import TopBar from "@/components/TopBar";
import { DynamicSidebar } from "@/components/DynamicSidebar";

interface BarLayoutProps {
  user?: User | null;
  BarComponent?: React.ComponentType<{
    openSidebar: boolean;
    toggleSideBar: () => void;
  }>;
}

export function BarLayout({ user, BarComponent }: BarLayoutProps) {
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
          />
        )}
      </DynamicSidebar>
    </>
  );
}
