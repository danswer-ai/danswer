/* "use client";

import {
  Search,
  MessageCircleMore,
  Headset,
  FolderPlus,
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
import { useChatContext } from "@/components/context/ChatContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const ChatSidebar = ({
  existingChats,
  currentChatSession,
  folders,
  openedFolders,
  toggleSideBar,
  isAssistant,
}: {
  existingChats: ChatSession[];
  currentChatSession: ChatSession | null | undefined;
  folders: Folder[];
  openedFolders: { [key: number]: boolean };
  toggleSideBar?: () => void;
  isAssistant?: boolean;
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
            flex-col 
            h-full
            flex
            z-overlay
            w-full 
            `}
        id="chat-sidebar"
      >
        <div className="flex items-center gap-2 w-full relative justify-between px-4 pb-4">
          <Image src={Logo} alt="enmedd-logo" height={40} />

          <div className="lg:hidden">
            <Button variant="ghost" size="icon" onClick={toggleSideBar}>
              <PanelLeftClose size={24} />
            </Button>
          </div>
        </div>

        <div className="h-full overflow-auto">
          <div className="flex px-4">
            {enterpriseSettings && enterpriseSettings.application_name ? (
              <div>
                <HeaderTitle>{enterpriseSettings.application_name}</HeaderTitle>

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
          <div className="px-4 text-sm flex flex-col">
            {settings.search_page_enabled && (
              <Link
                href="/search"
                className="flex px-4 py-2 h-10 rounded-regular cursor-pointer hover:bg-hover-light items-center gap-2"
              >
                <Search size={16} className="min-w-4 min-h-4" />
                Search
              </Link>
            )}
            {settings.chat_page_enabled && (
              <>
                <Link
                  href="/chat"
                  className={`flex px-4 py-2 h-10 rounded-regular cursor-pointer items-center gap-2 ${
                    !isAssistant
                      ? "bg-primary text-white"
                      : "hover:bg-hover-light"
                  }`}
                >
                  <MessageCircleMore size={16} className="min-w-4 min-h-4" />
                  Chat
                </Link>
                <Link
                  href="/assistants/mine"
                  className={`flex px-4 py-2 h-10 rounded-regular cursor-pointer items-center gap-2 ${
                    isAssistant
                      ? "bg-primary text-white"
                      : "hover:bg-hover-light"
                  }`}
                >
                  <Headset size={16} />
                  <span className="truncate">Explore Assistants</span>
                </Link>
              </>
            )}
            <Separator className="mt-3" />
          </div>

          <ChatTab
            existingChats={existingChats}
            currentChatId={currentChatId}
            folders={folders}
            openedFolders={openedFolders}
            toggleSideBar={toggleSideBar}
          />
        </div>

        <div className="flex items-center gap-3 px-4 pt-5 mt-auto">
          <Link
            href={
              "/chat" +
              (NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA &&
              currentChatSession
                ? `?assistantId=${currentChatSession.persona_id}`
                : "")
            }
            className=" w-full"
          >
            <Button
              className="transition-all ease-in-out duration-300 w-full"
              onClick={toggleSideBar}
            >
              <Plus size={16} />
              Start new chat
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
      </div>
    </>
  );
}; */

"use client";

import {
  Search,
  MessageCircleMore,
  Headset,
  FolderPlus,
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

import EnmeddLogo from "../../../../public/logo-brand.png";
import { HeaderTitle } from "@/components/header/Header";
import { useChatContext } from "@/components/context/ChatContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/Logo";

export const ChatSidebar = ({
  existingChats,
  currentChatSession,
  folders,
  openedFolders,
  toggleSideBar,
  isAssistant,
}: {
  existingChats: ChatSession[];
  currentChatSession: ChatSession | null | undefined;
  folders: Folder[];
  openedFolders: { [key: number]: boolean };
  toggleSideBar?: () => void;
  isAssistant?: boolean;
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
            flex-col 
            h-full
            flex
            z-overlay
            w-full 
            `}
        id="chat-sidebar"
      >
        <div className="flex items-center gap-2 w-full relative justify-between px-4 pb-6">
          {/* <Image src={EnmeddLogo} alt="enmedd-logo" height={40} /> */}
          <div className="flex">
            {enterpriseSettings && enterpriseSettings.application_name ? (
              <div className="flex items-center gap-3">
                <Logo />
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
              </div>
            ) : (
              <Image src={EnmeddLogo} alt="enmedd-logo" height={40} />
            )}
          </div>

          <div className="lg:hidden">
            <Button variant="ghost" size="icon" onClick={toggleSideBar}>
              <PanelLeftClose size={24} />
            </Button>
          </div>
        </div>

        <div className="h-full overflow-auto">
          {/* <div className="flex px-4">
            {enterpriseSettings && enterpriseSettings.application_name ? (
              <div>
                <HeaderTitle>{enterpriseSettings.application_name}</HeaderTitle>

                {!NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_DANSWER_POWERED && (
                  <p className="text-xs text-subtle -mt-1.5">
                    Powered by enMedD CHP
                  </p>
                )}
              </div>
            ) : (
              <></>
            )}
          </div> */}

          <div className="px-4 text-sm flex flex-col">
            <Separator className="mb-2" />

            {settings.search_page_enabled && (
              <Link
                href="/search"
                className="flex px-4 py-2 h-10 rounded-regular cursor-pointer hover:bg-hover-light items-center gap-2"
              >
                <Search size={16} className="min-w-4 min-h-4" />
                Search
              </Link>
            )}
            {settings.chat_page_enabled && (
              <>
                <Link
                  href="/chat"
                  className={`flex px-4 py-2 h-10 rounded-regular cursor-pointer items-center gap-2 ${
                    !isAssistant
                      ? "bg-primary text-white"
                      : "hover:bg-hover-light"
                  }`}
                >
                  <MessageCircleMore size={16} className="min-w-4 min-h-4" />
                  Chat
                </Link>
                <Link
                  href="/assistants/mine"
                  className={`flex px-4 py-2 h-10 rounded-regular cursor-pointer items-center gap-2 ${
                    isAssistant
                      ? "bg-primary text-white"
                      : "hover:bg-hover-light"
                  }`}
                >
                  <Headset size={16} />
                  <span className="truncate">Explore Assistants</span>
                </Link>
              </>
            )}
            <Separator className="mt-3" />
          </div>

          <ChatTab
            existingChats={existingChats}
            currentChatId={currentChatId}
            folders={folders}
            openedFolders={openedFolders}
            toggleSideBar={toggleSideBar}
          />
        </div>

        <div className="flex items-center gap-3 px-4 pt-5 mt-auto">
          <Link
            href={
              "/chat" +
              (NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA &&
              currentChatSession
                ? `?assistantId=${currentChatSession.persona_id}`
                : "")
            }
            className=" w-full"
          >
            <Button
              className="transition-all ease-in-out duration-300 w-full"
              onClick={toggleSideBar}
            >
              <Plus size={16} />
              Start new chat
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
      </div>
    </>
  );
};
