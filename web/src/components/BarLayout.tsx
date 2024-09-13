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
  isSearch?: boolean;
}

export function BarLayout({
  user,
  BarComponent,
  isSearch = false,
}: BarLayoutProps) {
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
        isSearch={isSearch}
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
