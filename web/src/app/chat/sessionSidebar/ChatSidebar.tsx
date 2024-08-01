"use client";

import {
  FiBook,
  FiEdit,
  FiFolderPlus,
  FiMessageSquare,
  FiPlusSquare,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BasicClickable, BasicSelectable } from "@/components/BasicClickable";
import { ChatSession } from "../interfaces";

import {
  NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_DANSWER_POWERED,
  NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA,
} from "@/lib/constants";

import { ChatTab } from "./ChatTab";
import { Folder } from "../folders/interfaces";
import { createFolder } from "../folders/FolderManagement";
import { usePopup } from "@/components/admin/connectors/Popup";
import { SettingsContext } from "@/components/settings/SettingsProvider";

import React from "react";
import { FaBrain, FaHeadset } from "react-icons/fa";
import Logo from "../../../../public/logo-brand.png";
import { HeaderTitle } from "@/components/header/Header";
import { UserSettingsButton } from "@/components/UserSettingsButton";
import { useChatContext } from "@/components/context/ChatContext";
import { Button } from "@tremor/react";
/* import { Button } from "@/components/ui/button"; */

export const ChatSidebar = ({
  existingChats,
  currentChatSession,
  folders,
  openedFolders,
  handleClose,
  openSidebar,
}: {
  existingChats: ChatSession[];
  currentChatSession: ChatSession | null | undefined;
  folders: Folder[];
  openedFolders: { [key: number]: boolean };
  handleClose?: () => void;
  openSidebar?: boolean;
}) => {
  let { user } = useChatContext();
  const router = useRouter();
  const { popup, setPopup } = usePopup();

  const currentChatId = currentChatSession?.id;

  // prevent the NextJS Router cache from causing the chat sidebar to not
  // update / show an outdated list of chats
  useEffect(() => {
    router.refresh();
  }, [currentChatId]);

  const combinedSettings = useContext(SettingsContext);
  if (!combinedSettings) {
    return null;
  }
  const settings = combinedSettings.settings;
  const enterpriseSettings = combinedSettings.enterpriseSettings;

  return (
    <>
      {popup}
      <div
        className={`py-4
        flex-none
        bg-background-weak
        border-r 
        border-border 
        flex-col 
        h-screen
        transition-transform z-30 ${
          openSidebar ? "w-full md:w-80 left-0 absolute flex" : "hidden lg:flex"
        }`}
        id="chat-sidebar"
      >
        <div className="flex">
          <div className="w-full">
            <div className="flex items-center w-full px-4">
              <div className="flex items-center justify-between w-full">
                <Image src={Logo} alt="enmedd-logo" width={112} />
                <FiX onClick={handleClose} className="lg:hidden" />
              </div>

              {enterpriseSettings && enterpriseSettings.application_name ? (
                <div>
                  <HeaderTitle>
                    {enterpriseSettings.application_name}
                  </HeaderTitle>

                  {!NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_DANSWER_POWERED && (
                    <p className="text-xs text-subtle -mt-1.5">
                      Powered by enMedD CHP
                    </p>
                  )}
                </div>
              ) : (
                <></>
              )}
            </div>
          </div>
        </div>
        {/* <HeaderTitle>enMedD CHP</HeaderTitle> */}
        {
          <div className="mt-5">
            {settings.search_page_enabled && (
              <Link
                href="/search"
                className="flex px-4 py-2 rounded cursor-pointer hover:bg-hover-light"
              >
                <FiSearch className="my-auto mr-2 text-base" />
                Search
              </Link>
            )}
            {settings.chat_page_enabled && (
              <>
                <Link
                  href="/chat"
                  className="flex px-4 py-2 rounded cursor-pointer hover:bg-hover-light"
                >
                  <FiMessageSquare className="my-auto mr-2 text-base" />
                  Chat
                </Link>
                <Link
                  href="/assistants/mine"
                  className="flex px-4 py-2 rounded cursor-pointer hover:bg-hover-light"
                >
                  <FaHeadset className="my-auto mr-2 text-base" />
                  My Assistants
                </Link>
              </>
            )}
          </div>
        }
        <div className="pb-4 mx-3 border-b border-border" />
        <ChatTab
          existingChats={existingChats}
          currentChatId={currentChatId}
          folders={folders}
          openedFolders={openedFolders}
        />
        <div className="flex items-center gap-3 px-3 pb-1">
          <Link
            href={
              "/chat" +
              (NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA &&
              currentChatSession
                ? `?assistantId=${currentChatSession.persona_id}`
                : "")
            }
            className="w-full"
          >
            <Button
              className="w-full border
        border-gray-300
        shadow-md
        rounded-lg
        font-medium 
        text-emphasis 
        text-sm
        h-full
        bg-background
        select-none
        hover:bg-hover-light"
            >
              <span className="flex p-1 items-center">
                <FiEdit className="ml-1 mr-2" /> New Chat
              </span>
            </Button>
          </Link>
          <div className="h-full ">
            <Button
              className="border
        border-gray-300
        shadow-md
        rounded-lg
        font-medium 
        text-emphasis 
        text-sm
        p-1
        h-full
        bg-background
        select-none
        hover:bg-hover-light px-3.5"
              onClick={() =>
                createFolder("New Folder")
                  .then((folderId) => {
                    console.log(`Folder created with ID: ${folderId}`);
                    router.refresh();
                  })
                  .catch((error) => {
                    console.error("Failed to create folder:", error);
                    setPopup({
                      message: `Failed to create folder: ${error.message}`,
                      type: "error",
                    });
                  })
              }
            >
              <FiFolderPlus className="mx-auto my-auto" />
            </Button>
          </div>
        </div>
        <UserSettingsButton user={user} />
      </div>
    </>
  );
};
