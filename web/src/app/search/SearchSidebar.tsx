"use client";

import React from "react";
import { Search, MessageCircleMore, Command } from "lucide-react";
import { useContext } from "react";
import Link from "next/link";
import Image from "next/image";

import EnmeddLogo from "../../../public/logo-brand.png";
import { Separator } from "@/components/ui/separator";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { PageTab } from "@/components/PageTab";
import { useSearchContext } from "@/context/SearchContext";
import { ChatSession } from "../chat/interfaces";
import { Logo } from "@/components/Logo";
import ArnoldAi from "../../../public/arnold_ai.png";
import { buildImgUrl } from "../chat/files/images/utils";

export const SearchSidebar = ({
  isExpanded,
  currentSearchSession,
  openSidebar,
  teamspaceId,
  toggleSideBar,
}: {
  isExpanded?: boolean;
  currentSearchSession?: ChatSession | null | undefined;
  openSidebar?: boolean;
  teamspaceId?: string;
  toggleSideBar?: () => void;
}) => {
  const { querySessions } = useSearchContext();
  const combinedSettings = useContext(SettingsContext);
  if (!combinedSettings) {
    return null;
  }
  const settings = combinedSettings.settings;
  const workspaces = combinedSettings.workspaces;

  const currentSearchId = currentSearchSession?.id;

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
        <div className="flex items-center gap-1 w-full relative justify-center px-4 pb-5 pt-1">
          {workspaces && workspaces.custom_header_logo ? (
            <img
              src={buildImgUrl(workspaces?.custom_header_logo)}
              alt="Logo"
              className="h-8 object-contain w-full"
            />
          ) : (
            <Image src={ArnoldAi} alt="arnoldai-logo" height={32} />
          )}
        </div>

        <div className="h-full overflow-y-auto">
          <div className="px-4 text-sm font-medium flex flex-col">
            {settings.search_page_enabled && (
              <>
                <Separator className="mb-4" />
                <Link
                  href={teamspaceId ? `/t/${teamspaceId}/search` : "/search"}
                  className={`flex px-4 py-2 h-10 rounded-regular cursor-pointer bg-brand-500 text-white items-center gap-2 justify-between`}
                >
                  <div className="flex items-center gap-2">
                    <Search size={16} className="shrink-0" />
                    Search
                  </div>
                  <div className="flex items-center gap-1 font-normal">
                    <Command size={14} />S
                  </div>
                </Link>
              </>
            )}
            {settings.chat_page_enabled && (
              <>
                <Link
                  href={teamspaceId ? `/t/${teamspaceId}/chat` : "/chat"}
                  className={`flex px-4 py-2 h-10 rounded-regular cursor-pointer hover:bg-hover-light items-center gap-2 justify-between`}
                >
                  <div className="flex items-center gap-2">
                    <MessageCircleMore size={16} className="shrink-0" />
                    Chat
                  </div>

                  <div className="flex items-center gap-1 font-normal">
                    <Command size={14} />D
                  </div>
                </Link>
              </>
            )}
            <Separator className="mt-4" />
            <PageTab
              existingChats={querySessions}
              currentChatId={currentSearchId}
              toggleSideBar={toggleSideBar}
              teamspaceId={teamspaceId}
              isSearch
            />
          </div>
        </div>
      </div>
    </>
  );
};
