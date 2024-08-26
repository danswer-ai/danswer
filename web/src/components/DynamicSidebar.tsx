"use client";

import { AnimatePresence, motion } from "framer-motion";
import { WorkSpaceSidebar } from "@/app/chat/sessionSidebar/WorkSpaceSidebar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { User } from "@/lib/types";
import { useState } from "react";

interface SidebarProps {
  user?: User | null;
  isSearch?: boolean;
  openSidebar?: boolean;
  toggleLeftSideBar?: () => void;
  isExpanded?: boolean;
  toggleWidth?: () => void;
  children?: React.ReactNode;
}

export function DynamicSidebar({
  user,
  isSearch,
  openSidebar,
  toggleLeftSideBar,
  toggleWidth,
  isExpanded,
  children,
}: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <AnimatePresence>
        {openSidebar && (
          <motion.div
            className={`fixed w-full h-full bg-background-inverted bg-opacity-20 inset-0 z-overlay lg:hidden`}
            initial={{ opacity: 0 }}
            animate={{ opacity: openSidebar ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.2,
              opacity: { delay: openSidebar ? 0 : 0.3 },
            }}
            style={{ pointerEvents: openSidebar ? "auto" : "none" }}
            onClick={toggleLeftSideBar}
          />
        )}
      </AnimatePresence>

      <div
        className={`fixed flex-none h-full z-overlay top-0 left-0 transition-[width] ease-in-out duration-500 overflow-hidden lg:overflow-visible lg:!w-auto ${
          openSidebar ? "w-[85vw]" : "w-0"
        } ${isSearch ? "xl:relative" : "lg:relative"}`}
      >
        <div
          className="h-full relative flex w-full"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <WorkSpaceSidebar openSidebar={openSidebar} user={user} />
          {children}
          <div
            className={`h-full flex items-center justify-center transition-opacity ease-in-out duration-200 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <button
              onClick={toggleWidth}
              className="border rounded-r py-2 border-l-0"
            >
              {isExpanded ? (
                <ChevronLeft size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
