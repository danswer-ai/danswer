/* "use client";

import { useState } from "react";
import { User } from "@/lib/types";
import { DynamicSidebar } from "../DynamicSidebar";
import { SideBar } from "../SideBar";
import TopBar from "../TopBar";

interface AdminBarsProps {
  user?: User | null;
}

export default function AdminBars({ user }: AdminBarsProps) {
  const [openSidebar, setOpenSidebar] = useState(false);

  const toggleLeftSideBar = () => {
    setOpenSidebar((prevState) => !prevState);
  };

  return (
    <>
      <TopBar toggleLeftSideBar={toggleLeftSideBar} />

      <DynamicSidebar
        user={user}
        openSidebar={openSidebar}
        toggleLeftSideBar={toggleLeftSideBar}
      >
        <SideBar />
      </DynamicSidebar>
    </>
  );
} */
"use client";

import { DynamicSidebar } from "@/components/DynamicSidebar";
import { useState } from "react";
import { User } from "@/lib/types";
import TopBar from "@/components/TopBar";

export function AdminBars({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: User | null;
}) {
  const [openSidebar, setOpenSidebar] = useState(false);

  const toggleLeftSideBar = () => {
    setOpenSidebar((prevState) => !prevState);
  };

  return (
    <>
      <TopBar toggleLeftSideBar={toggleLeftSideBar} />

      <DynamicSidebar
        user={user}
        openSidebar={openSidebar}
        isSearch
        toggleLeftSideBar={toggleLeftSideBar}
      >
        {children}
      </DynamicSidebar>
    </>
  );
}
