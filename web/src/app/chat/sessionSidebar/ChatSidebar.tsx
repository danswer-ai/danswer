"use client";

import {
  Search,
  MessageCircleMore,
  FolderPlus,
  Plus,
  Command,
} from "lucide-react";
import { useContext, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChatSession } from "../interfaces";

import { NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_ASSISTANT } from "@/lib/constants";

import { Folder } from "../folders/interfaces";
import { createFolder } from "../folders/FolderManagement";
import { SettingsContext } from "@/components/settings/SettingsProvider";

import EnmeddLogo from "../../../../public/logo-brand.png";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CustomTooltip } from "@/components/CustomTooltip";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Logo } from "@/components/Logo";
import ArnoldAi from "../../../../public/arnold_ai.png";

export const ChatSidebar = ({
  existingChats,
  currentChatSession,
  folders,
  openedFolders,
  toggleSideBar,
  isAssistant,
  teamspaceId,
  chatSessionIdRef,
}: {
  existingChats: ChatSession[];
  currentChatSession: ChatSession | null | undefined;
  folders: Folder[];
  openedFolders: { [key: number]: boolean };
  toggleSideBar?: () => void;
  isAssistant?: boolean;
  teamspaceId?: string;
  chatSessionIdRef?: React.MutableRefObject<number | null>;
}) => {
  const router = useRouter();
  const { toast } = useToast();

  const currentChatId = currentChatSession?.id;

  // prevent the NextJS Router cache from causing the chat sidebar to not
  // update / show an outdated list of chats
  useEffect(() => {
    router.refresh();
  }, [currentChatId, router]);

  useKeyboardShortcuts([
    {
      key: "k",
      handler: () => {
        router.push(
          `${teamspaceId ? `/t/${teamspaceId}` : ""}/chat` +
            (NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_ASSISTANT &&
            currentChatSession
              ? `?assistantId=${currentChatSession.assistant_id}`
              : "")
        );
      },
      ctrlKey: true,
    },
    {
      key: "i",
      handler: () => {
        createFolder("New Folder")
          .then((folderId) => {
            console.log(`Folder created with ID: ${folderId}`);
            router.refresh();
          })
          .catch((error) => {
            console.error("Failed to create folder:", error);
            toast({
              title: "Folder Creation Failed",
              description: `Unable to create the folder: ${error.message}. Please try again.`,
              variant: "destructive",
            });
          });
      },
      ctrlKey: true,
    },
  ]);

  const combinedSettings = useContext(SettingsContext);
  if (!combinedSettings) {
    return null;
  }
  const settings = combinedSettings.settings;
  const workspaces = combinedSettings.workspaces;

  return (
    <>
      <div
        className={`
            flex-col 
            h-full
            flex
            z-overlay
            w-full py-4
            `}
        id="chat-sidebar"
      >
        <div className="flex items-center w-full relative justify-center px-4 pb-4">
          <div className="flex h-full items-center gap-1">
            {workspaces && workspaces.use_custom_logo ? (
              <Logo />
            ) : (
              <Image src={ArnoldAi} alt="arnoldai-logo" height={32} />
            )}
            <span className="text-lg font-semibold">
              {workspaces && workspaces.workspace_name
                ? workspaces.workspace_name
                : "Arnold AI"}
            </span>
          </div>

          {/* <Button
            variant="ghost"
            size="icon"
            onClick={toggleSideBar}
            className="lg:hidden"
          >
            <PanelLeftClose size={24} />
          </Button> */}
        </div>

        <div className="h-full overflow-y-auto">
          <div className="px-4 text-sm font-medium flex flex-col">
            <Separator className="mb-4" />
            {settings.search_page_enabled && (
              <Link
                href={teamspaceId ? `/t/${teamspaceId}/search` : "/search"}
                className="flex px-4 py-2 h-10 rounded-regular cursor-pointer hover:bg-hover-light items-center gap-2 justify-between"
              >
                <div className="flex items-center gap-2">
                  <Search size={16} className="shrink-0" />
                  Search
                </div>
                <div className="flex items-center gap-1 font-normal">
                  <Command size={14} />S
                </div>
              </Link>
            )}
            {settings.chat_page_enabled && (
              <>
                <Link
                  href={teamspaceId ? `/t/${teamspaceId}/chat` : "/chat"}
                  className={`flex px-4 py-2 h-10 rounded-regular cursor-pointer items-center gap-2 justify-between ${
                    !isAssistant
                      ? "bg-brand-500 text-white"
                      : "hover:bg-hover-light"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageCircleMore size={16} className="shrink-0" />
                    Chat
                  </div>

                  <div className="flex items-center gap-1 font-normal">
                    <Command size={14} />D
                  </div>
                </Link>
                {/* {combinedSettings.featureFlags.explore_assistants && (
                  <Link
                    href="/assistants/mine"
                    className={`flex px-4 py-2 h-10 rounded-regular cursor-pointer items-center gap-2 ${
                      isAssistant
                        ? "bg-brand-500 text-white"
                        : "hover:bg-hover-light"
                    }`}
                  >
                    <Headset size={16} />
                    <span className="truncate">Explore Assistants</span>
                  </Link>
                )} */}
              </>
            )}
            <Separator className="mt-4" />
          </div>
          <PageTab
            existingChats={existingChats}
            currentChatId={currentChatId}
            folders={folders}
            openedFolders={openedFolders}
            toggleSideBar={toggleSideBar}
            teamspaceId={teamspaceId}
            chatSessionIdRef={chatSessionIdRef}
          />
        </div>

        <div className="flex items-center gap-3 px-4 pt-5 mt-auto">
          <Link
            href={
              `${teamspaceId ? `/t/${teamspaceId}` : ""}/chat` +
              (NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_ASSISTANT &&
              currentChatSession
                ? `?assistantId=${currentChatSession.assistant_id}`
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
            <CustomTooltip
              asChild
              trigger={
                <Button
                  onClick={() =>
                    createFolder("New Folder", teamspaceId)
                      .then((folderId) => {
                        console.log(`Folder created with ID: ${folderId}`);
                        router.refresh();
                      })
                      .catch((error) => {
                        console.error("Failed to create folder:", error);
                        toast({
                          title: "Folder Creation Failed",
                          description: `Unable to create the folder: ${error.message}. Please try again.`,
                          variant: "destructive",
                        });
                      })
                  }
                  size="icon"
                >
                  <FolderPlus size={16} />
                </Button>
              }
              side="right"
            >
              Create New Folder
            </CustomTooltip>
          </div>
        </div>
      </div>
    </>
  );
};
