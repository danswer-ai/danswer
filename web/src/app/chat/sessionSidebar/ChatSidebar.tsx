"use client";

import {
  FiBook,
  FiEdit,
  FiFolderPlus,
  FiMessageSquare,
  FiPlusSquare,
  FiSearch,
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
import { Logo } from "@/components/Logo";
import { HeaderTitle } from "@/components/header/Header";
import { UserSettingsButton } from "@/components/UserSettingsButton";
import { useChatContext } from "@/components/context/ChatContext";

export const ChatSidebar = ({
  existingChats,
  currentChatSession,
  folders,
  openedFolders,
}: {
  existingChats: ChatSession[];
  currentChatSession: ChatSession | null | undefined;
  folders: Folder[];
  openedFolders: { [key: number]: boolean };
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
        className={`
        w-64
        py-4
        flex
        flex-none
        bg-background-weak
        3xl:w-72
        border-r 
        border-border 
        flex-col 
        h-screen
        transition-transform`}
        id="chat-sidebar"
      >
        <div className="flex">
          <Link
            className="w-full"
            href={
              settings && settings.default_page === "chat" ? "/chat" : "/search"
            }
          >
            <div className="flex w-full items-center justify-center">
              <Logo height={32} width={32} className="mr-1 my-auto" />

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
                <HeaderTitle>enMedD CHP</HeaderTitle>
              )}
            </div>
          </Link>
        </div>
        {
          <div className="mt-5">
            {settings.search_page_enabled && (
              <Link
                href="/search"
                className="flex py-2 px-4 rounded cursor-pointer hover:bg-hover-light"
              >
                <FiSearch className="my-auto mr-2 text-base" />
                Search
              </Link>
            )}
            {settings.chat_page_enabled && (
              <>
                <Link
                  href="/chat"
                  className="flex py-2 px-4 rounded cursor-pointer hover:bg-hover-light"
                >
                  <FiMessageSquare className="my-auto mr-2 text-base" />
                  Chat
                </Link>
                <Link
                  href="/assistants/mine"
                  className="flex py-2 px-4 rounded cursor-pointer hover:bg-hover-light"
                >
                  <FaHeadset className="my-auto mr-2 text-base" />
                  My Assistants
                </Link>
              </>
            )}
          </div>
        }
        <div className="border-b border-border pb-4 mx-3" />

        <ChatTab
          existingChats={existingChats}
          currentChatId={currentChatId}
          folders={folders}
          openedFolders={openedFolders}
        />

        <div className="flex gap-3 pb-1 items-center px-3">
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
            <BasicClickable fullWidth>
              <div className="flex px-2 py-1 items-center text-base">
                <FiEdit className="ml-1 mr-2" /> New Chat
              </div>
            </BasicClickable>
          </Link>
          <div className=" h-full">
            <BasicClickable
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
              <div className="flex items-center text-base aspect-square h-full">
                <FiFolderPlus className="mx-auto my-auto" />
              </div>
            </BasicClickable>
          </div>
        </div>
        <UserSettingsButton user={user} />
      </div>
    </>
  );
};
