"use client";

import React, { useState } from "react";
import {
  Search,
  MessageCircleMore,
  Headset,
  FolderPlus,
  X,
  Plus,
  PanelLeftClose,
  Menu,
  ChevronLeft,
  ChevronRight,
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
import SmallLogo from "../../../../public/logo.png";
import { HeaderTitle } from "@/components/header/Header";
import { UserSettingsButton } from "@/components/UserSettingsButton";
import { useChatContext } from "@/components/context/ChatContext";
import { Button } from "@/components/ui/button";
import { Hoverable } from "@/components/Hoverable";
import { Separator } from "@/components/ui/separator";

export const ChatSidebar = ({
  existingChats,
  currentChatSession,
  folders,
  openedFolders,
  openSidebar,
  toggleSideBar,
  toggleWidth,
  isExpanded,
}: {
  existingChats: ChatSession[];
  currentChatSession: ChatSession | null | undefined;
  folders: Folder[];
  openedFolders: { [key: number]: boolean };
  openSidebar: boolean;
  toggleSideBar?: () => void;
  toggleWidth?: () => void;
  isExpanded: boolean;
}) => {
  let { user } = useChatContext();
  const router = useRouter();
  const { popup, setPopup } = usePopup();
  const [isHovered, setIsHovered] = useState(false);

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
        className={`fixed flex-none xl:relative w-0 h-screen bg-black z-overlay bg-opacity-20 top-0 left-0 ${
          !openSidebar ? "w-0 xl:w-auto" : "w-screen xl:w-auto"
        }`}
      >
        <div
          className={`py-4
            bg-background
            border-r 
            border-border 
            flex-col 
            h-full
            ease-in-out duration-500
            flex
            transition-all
            w-0
            relative
            ${isExpanded ? "xl:w-[75px]" : "xl:w-[300px]"}
            ${!openSidebar ? "w-0" : "w-[300px] md:w-1/2"}
            `}
          id="chat-sidebar"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isHovered && (
            <button
              onClick={toggleWidth}
              className="absolute left-full bottom-1/2 -translate-y-1/2 border rounded py-2 transition-all ease-in-out duration-300 hidden xl:flex"
            >
              {isExpanded ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>
          )}

          <div
            className={`h-full overflow-hidden flex flex-col ${
              !openSidebar
                ? "invisible xl:visible xl:opacity-100 opacity-0 duration-200"
                : "visible opacity-100 duration-700 delay-300"
            }`}
          >
            <div className="flex px-4">
              <div className="w-full">
                <div className="flex items-center w-full">
                  <div className="flex items-center gap-2 w-full relative">
                    <div className="xl:hidden">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSideBar}
                      >
                        <X size={24} />
                      </Button>
                    </div>

                    <Image
                      src={isExpanded ? SmallLogo : Logo}
                      alt="enmedd-logo"
                      height={35}
                      className="opacity-100 transition-opacity duration-500 ease-in-out"
                    />
                    {/* {!isExpanded && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleWidth}
                        className="ml-auto hidden xl:flex"
                      >
                        <PanelLeftClose size={24} />
                      </Button>
                    )} */}
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
            <div className="p-4 pb-0 text-sm text-emphasis font-medium flex flex-col gap-1">
              {settings.search_page_enabled && (
                <Link
                  href="/search"
                  className={`flex p-2 rounded cursor-pointer hover:bg-hover-light items-center gap-2`}
                >
                  <Search
                    size={16}
                    className={`min-w-4 min-h-4 ${isExpanded && "ml-[5px]"}`}
                  />
                  <span
                    className={
                      isExpanded
                        ? "invisible opacity-0 duration-200"
                        : " opacity-100 duration-700 xl:delay-300"
                    }
                  >
                    Search
                  </span>
                </Link>
              )}
              {settings.chat_page_enabled && (
                <>
                  <Link
                    href="/chat"
                    className={`flex p-2 rounded cursor-pointer hover:bg-hover-light items-center gap-2`}
                    onClick={toggleSideBar}
                  >
                    <MessageCircleMore
                      size={16}
                      className={`min-w-4 min-h-4 ${isExpanded && "ml-[5px]"}`}
                    />
                    <span
                      className={
                        isExpanded
                          ? "invisible opacity-0 duration-200"
                          : " opacity-100 duration-700 xl:delay-300"
                      }
                    >
                      Chat
                    </span>
                  </Link>
                  <Link
                    href="/assistants/mine"
                    className={`flex p-2 rounded cursor-pointer hover:bg-hover-light items-center gap-2`}
                  >
                    <Headset
                      size={16}
                      className={`min-w-4 min-h-4 ${isExpanded && "ml-[5px]"}`}
                    />
                    <span
                      className={`truncate ${
                        isExpanded
                          ? "invisible opacity-0 duration-200"
                          : " opacity-100 duration-700 xl:delay-300"
                      }`}
                    >
                      Explore Assistants
                    </span>
                  </Link>
                </>
              )}
              <Separator className="mt-4" />
            </div>

            <ChatTab
              existingChats={existingChats}
              currentChatId={currentChatId}
              folders={folders}
              openedFolders={openedFolders}
              isExpanded={isExpanded}
              toggleSideBar={toggleSideBar}
            />

            <div
              className={`flex items-center gap-3 pb-1 px-4 pt-4 transition-transform ease-in-out duration-1000 ${
                isExpanded ? "flex-col delay-300" : "flex-row duration-200"
              }`}
            >
              <Link
                href={
                  "/chat" +
                  (NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA &&
                  currentChatSession
                    ? `?assistantId=${currentChatSession.persona_id}`
                    : "")
                }
                className={!isExpanded ? "w-full" : ""}
              >
                <Button
                  className={`transition-all ease-in-out duration-300 ${
                    !isExpanded ? "w-full" : ""
                  }`}
                  size={isExpanded ? "icon" : "default"}
                  onClick={toggleSideBar}
                >
                  <Plus size={16} />
                  {!isExpanded && "Start new chat"}
                </Button>
              </Link>
              <div>
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
                  size="icon"
                >
                  <FolderPlus size={16} />
                </Button>
              </div>
            </div>
            <UserSettingsButton user={user} isExpanded={isExpanded} />
          </div>
        </div>
      </div>
    </>
  );
};
