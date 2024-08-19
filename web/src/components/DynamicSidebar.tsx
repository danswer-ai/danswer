"use client";

import { AnimatePresence, motion } from "framer-motion";
import { WorkSpaceSidebar } from "@/app/chat/sessionSidebar/WorkSpaceSidebar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { User } from "@/lib/types";

interface SidebarProps {
  user?: User | null;
  isSearch?: boolean;
  openSidebar: boolean;
  toggleLeftSideBar: () => void;
  isExpanded: boolean;
  toggleWidth: () => void;
  children: React.ReactNode;
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
  return (
    <>
      <AnimatePresence>
        {openSidebar && (
          <motion.div
            className={`fixed w-full h-full bg-black bg-opacity-20 inset-0 z-overlay lg:hidden`}
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
        <div className="h-full relative flex w-full">
          <WorkSpaceSidebar openSidebar={openSidebar} user={user} />
          {children}
          <button
            onClick={toggleWidth}
            className="absolute bottom-1/2 -translate-y-1/2 border rounded-r py-2 transition-all ease-in-out duration-500 border-l-0 z-modal left-full"
          >
            {isExpanded ? (
              <ChevronLeft size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
