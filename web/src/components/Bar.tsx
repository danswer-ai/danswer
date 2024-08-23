"use client";

import { DynamicSidebar } from "@/components/DynamicSidebar";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PanelRightClose } from "lucide-react";
import Image from "next/image";
import Logo from "../../public/logo-brand.png";
import { User } from "@/lib/types";
import { SearchSidebar } from "../app/search/SearchSidebar";

interface BarProps {
  user?: User | null;
}

export function Bar({ user }: BarProps) {
  const [openSidebar, setOpenSidebar] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleWidth = () => {
    setIsExpanded((prevState) => !prevState);
  };

  const toggleLeftSideBar = () => {
    setOpenSidebar((prevState) => !prevState);
  };

  return (
    <>
      <div className="fixed top-0 left-0 flex w-full z-top-bar bg-background">
        <div className="flex w-full items-start p-4 justify-between">
          <div className="flex lg:hidden items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleLeftSideBar}>
              <PanelRightClose size={24} />
            </Button>
            <Image src={Logo} alt="Logo" width={112} />
          </div>
        </div>
      </div>

      <DynamicSidebar
        user={user}
        openSidebar={openSidebar}
        isSearch
        toggleLeftSideBar={toggleLeftSideBar}
        toggleWidth={toggleWidth}
        isExpanded={isExpanded}
      >
        <SearchSidebar
          toggleSideBar={toggleLeftSideBar}
          openSidebar={openSidebar}
          isExpanded={isExpanded}
        />
      </DynamicSidebar>
    </>
  );
}
