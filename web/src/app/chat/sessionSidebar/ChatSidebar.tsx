"use client";

import React from "react";
import {
  Search,
  MessageCircleMore,
  Headset,
  FolderPlus,
  X,
  Plus,
  PanelLeftClose,
} from "lucide-react";
import { useContext, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
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

import Logo from "../../../../public/logo-brand.png";
import { HeaderTitle } from "@/components/header/Header";
import { UserSettingsButton } from "@/components/UserSettingsButton";
import { useChatContext } from "@/components/context/ChatContext";
import { Button } from "@/components/ui/button";

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
        bg-background
        border-r 
        border-border 
        flex-col 
        h-screen
        w-[270px]
        transition-transform z-30 ${
          openSidebar ? "w-full md:w-80 left-0 absolute flex" : "hidden lg:flex"
        }`}
        id="chat-sidebar"
      >
        <div className="flex px-4">
          <div className="w-full">
            <div className="flex items-center w-full">
              <div className="flex items-center justify-between w-full">
                <Image src={Logo} alt="enmedd-logo" width={112} />
                <X onClick={handleClose} className="lg:hidden" size={16} />
                <PanelLeftClose size={24} />
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
          <div className="mt-5 text-sm text-emphasis font-medium px-4">
            {settings.search_page_enabled && (
              <Link
                href="/search"
                className="flex p-2 rounded cursor-pointer hover:bg-hover-light"
              >
                <Search className="my-auto mr-2" size={16} />
                Search
              </Link>
            )}
            {settings.chat_page_enabled && (
              <>
                <Link
                  href="/chat"
                  className="flex p-2 rounded cursor-pointer hover:bg-hover-light"
                >
                  <MessageCircleMore className="my-auto mr-2" size={16} />
                  Chat
                </Link>
                <Link
                  href="/assistants/mine"
                  className="flex p-2 rounded cursor-pointer hover:bg-hover-light"
                >
                  <Headset className="my-auto mr-2" size={16} />
                  Explore Assistants
                </Link>
              </>
            )}
          </div>
        }
        <div className="pb-4 border-b border-border" />
        <ChatTab
          existingChats={existingChats}
          currentChatId={currentChatId}
          folders={folders}
          openedFolders={openedFolders}
        />
        <div className="flex items-center gap-3 pb-1 px-4">
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
            <Button className="w-full">
              <Plus className="mr-1" size={16} /> Start new chat
            </Button>
          </Link>
          <div className="h-full ">
            <Button
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
              <FolderPlus size={16} />
            </Button>
          </div>
        </div>
        <UserSettingsButton user={user} />
      </div>
    </>
  );
};
