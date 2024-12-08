"use client";

import { FiEdit, FiFolderPlus } from "react-icons/fi";
import React, { ForwardedRef, forwardRef, useContext, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatSession } from "../interfaces";
import { NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA } from "@/lib/constants";
import { Folder } from "../folders/interfaces";
import { createFolder } from "../folders/FolderManagement";
import { usePopup } from "@/components/admin/connectors/Popup";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import {
  AssistantsIconSkeleton,
  ClosedBookIcon,
} from "@/components/icons/icons";
import { PagesTab } from "./PagesTab";
import { pageType } from "./types";
import LogoType from "@/components/header/LogoType";

interface HistorySidebarProps {
  page: pageType;
  existingChats?: ChatSession[];
  currentChatSession?: ChatSession | null | undefined;
  folders?: Folder[];
  openedFolders?: { [key: number]: boolean };
  toggleSidebar?: () => void;
  toggled?: boolean;
  removeToggle?: () => void;
  reset?: () => void;
  showShareModal?: (chatSession: ChatSession) => void;
  showDeleteModal?: (chatSession: ChatSession) => void;
  stopGenerating?: () => void;
  explicitlyUntoggle: () => void;
  backgroundToggled?: boolean;
}

export const HistorySidebar = forwardRef<HTMLDivElement, HistorySidebarProps>(
  (
    {
      reset = () => null,
      toggled,
      page,
      existingChats,
      currentChatSession,
      folders,
      openedFolders,
      explicitlyUntoggle,
      toggleSidebar,
      removeToggle,
      stopGenerating = () => null,
      showShareModal,
      showDeleteModal,
      backgroundToggled,
    },
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const router = useRouter();
    const { popup, setPopup } = usePopup();
    const [newFolderId, setNewFolderId] = useState<number | null>(null);
    const currentChatId = currentChatSession?.id;
    const combinedSettings = useContext(SettingsContext);

    if (!combinedSettings) {
      return null;
    }

    const handleNewChat = () => {
      reset();
      const newChatUrl =
        `/${page}` +
        (NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA && currentChatSession
          ? `?assistantId=${currentChatSession.persona_id}`
          : "");
      router.push(newChatUrl);
    };

    return (
      <>
        {popup}
        <div
          ref={ref}
          className={`
            flex flex-col h-screen w-full
            bg-[#f1eee8]
            border-r border-[#dcdad4]
            font-['KH Teka TRIAL']
            relative
            pt-2
            shadow-md
          `}
        >
          <LogoType
            showArrow={true}
            toggled={toggled}
            page={page}
            toggleSidebar={toggleSidebar}
            explicitlyUntoggle={explicitlyUntoggle}
            // Customize LogoType if needed to match final design
          />

          {page === "chat" && (
            <div className="mx-3 mt-4 flex flex-col gap-y-2 text-black">
              <Link
                className="w-full p-2 bg-white border border-[#dcdad4] rounded hover:bg-[#fffcf4] cursor-pointer transition-all duration-150 flex items-center gap-x-2"
                href={
                  `/${page}` +
                  (NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA &&
                  currentChatSession?.persona_id
                    ? `?assistantId=${currentChatSession.persona_id}`
                    : "")
                }
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey) return;
                  handleNewChat();
                }}
              >
                <FiEdit className="text-black" />
                <p className="text-base font-medium leading-normal">New Chat</p>
              </Link>
              <button
                onClick={() =>
                  createFolder("New Folder")
                    .then((folderId) => {
                      router.refresh();
                      setNewFolderId(folderId);
                    })
                    .catch((error) => {
                      console.error("Failed to create folder:", error);
                      setPopup({
                        message: `Failed to create folder: ${error.message}`,
                        type: "error",
                      });
                    })
                }
                className="w-full p-2 bg-white border border-[#dcdad4] rounded hover:bg-[#fffcf4] cursor-pointer transition-all duration-150 flex items-center gap-x-2"
              >
                <FiFolderPlus className="text-black" />
                <p className="text-base font-medium leading-normal">
                  New Folder
                </p>
              </button>

              <Link
                href="/assistants/mine"
                className="w-full p-2 bg-white border border-[#dcdad4] rounded hover:bg-[#fffcf4] cursor-pointer transition-all duration-150 flex items-center gap-x-2"
              >
                <AssistantsIconSkeleton className="h-4 w-4 text-black" />
                <p className="text-base font-medium leading-normal">
                  Manage Assistants
                </p>
              </Link>
              <Link
                href="/prompts"
                className="w-full p-2 bg-white border border-[#dcdad4] rounded hover:bg-[#fffcf4] cursor-pointer transition-all duration-150 flex items-center gap-x-2"
              >
                <ClosedBookIcon className="h-4 w-4 text-black" />
                <p className="text-base font-medium leading-normal">
                  Manage Prompts
                </p>
              </Link>
            </div>
          )}

          <div className="border-b border-[#dcdad4] pb-4 mx-3 mt-4" />

          <PagesTab
            newFolderId={newFolderId}
            showDeleteModal={showDeleteModal}
            showShareModal={showShareModal}
            closeSidebar={removeToggle}
            page={page}
            existingChats={existingChats}
            currentChatId={currentChatId}
            folders={folders}
            openedFolders={openedFolders}
          />
        </div>
      </>
    );
  }
);
HistorySidebar.displayName = "HistorySidebar";
