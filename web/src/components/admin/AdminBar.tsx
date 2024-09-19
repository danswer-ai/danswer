"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { User } from "@/lib/types";
import TopBar from "@/components/TopBar";
import { DynamicSidebar } from "@/components/DynamicSidebar";

export function AdminBar({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: User | null;
}) {
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
        {children}
      </DynamicSidebar>
    </>
  );
}
