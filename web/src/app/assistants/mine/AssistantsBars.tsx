"use client";

import { DynamicSidebar } from "@/components/DynamicSidebar";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PanelRightClose } from "lucide-react";
import Image from "next/image";
import Logo from "../../../public/logo-brand.png";
import { User } from "@/lib/types";
import TopBar from "@/components/TopBar";

export function AssistantsBars({
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
