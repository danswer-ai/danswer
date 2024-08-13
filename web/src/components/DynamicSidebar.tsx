"use client";

import { AnimatePresence, motion } from "framer-motion";
import { WorkSpaceSidebar } from "@/app/chat/sessionSidebar/WorkSpaceSidebar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { User } from "@/lib/types";
import { ChatSidebar } from "@/app/chat/sessionSidebar/ChatSidebar";
import { useChatContext } from "@/components/context/ChatContext";
import { useSearchParams } from "next/navigation";

interface SidebarProps {
  user?: User | null;
  isSearch?: boolean;
  openSidebar: boolean;
  toggleLeftSideBar: () => void;
}

export function DynamicSidebar({
  user,
  isSearch,
  openSidebar,
  toggleLeftSideBar,
}: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleWidth = () => {
    setIsExpanded((prevState) => !prevState);
  };

  let { chatSessions, folders, openedFolders } = useChatContext();

  const searchParams = useSearchParams();
  const existingChatIdRaw = searchParams.get("chatId");
  const existingChatSessionId = existingChatIdRaw
    ? parseInt(existingChatIdRaw)
    : null;
  const selectedChatSession = chatSessions.find(
    (chatSession) => chatSession.id === existingChatSessionId
  );

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
          <WorkSpaceSidebar openSidebar={openSidebar} />
          <ChatSidebar
            existingChats={chatSessions}
            currentChatSession={selectedChatSession}
            folders={folders}
            openedFolders={openedFolders}
            toggleSideBar={toggleLeftSideBar}
            isExpanded={isExpanded}
            isSearch={isSearch}
            openSidebar={openSidebar}
          />
          <button
            onClick={toggleWidth}
            className="absolute bottom-1/2 -translate-y-1/2 border rounded-r py-2 transition-all ease-in-out duration-500 border-l-0 z-modal left-full"
          >
            {isExpanded ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronLeft size={16} />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
