"use client";

import React, { useState } from "react";
import {
  Search,
  MessageCircleMore,
  Headset,
  PanelLeftClose,
} from "lucide-react";
import { useContext, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePopup } from "@/components/admin/connectors/Popup";

import EnmeddLogo from "../../../public/logo-brand.png";
import { HeaderTitle } from "@/components/header/Header";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_ENMEDD_POWERED } from "@/lib/constants";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { Logo } from "@/components/Logo";

export const SearchSidebar = ({
  isExpanded,
  openSidebar,
  toggleSideBar,
}: {
  isExpanded?: boolean;
  openSidebar?: boolean;
  toggleSideBar?: () => void;
}) => {
  const { popup, setPopup } = usePopup();

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
          <div className="flex">
            {enterpriseSettings && enterpriseSettings.application_name ? (
              <div className="flex items-center gap-3">
                <Logo />
                <div>
                  <HeaderTitle>
                    {enterpriseSettings.application_name}
                  </HeaderTitle>

                  {!NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_ENMEDD_POWERED && (
                    <p className="text-xs text-subtle -mt-1.5">
                      Powered by enMedD AI
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
          <div className="px-4 text-sm  font-medium flex flex-col gap-1">
            {settings.search_page_enabled && (
              <>
                <Separator className="mb-2" />
                <Link
                  href="/search"
                  className={`flex px-4 py-2 h-10 rounded-regular cursor-pointer bg-primary text-white items-center gap-2 shadow-sm`}
                >
                  <Search size={16} className="min-w-4 min-h-4" />
                  Search
                </Link>
              </>
            )}
            {settings.chat_page_enabled && (
              <>
                <Link
                  href="/chat"
                  className={`flex px-4 py-2 h-10 rounded-regular cursor-pointer hover:bg-hover-light items-center gap-2`}
                >
                  <MessageCircleMore size={16} className="min-w-4 min-h-4" />
                  Chat
                </Link>
                <Link
                  href="/assistants/mine"
                  className="flex px-4 py-2 h-10 rounded-regular cursor-pointer hover:bg-hover-light items-center gap-2"
                >
                  <Headset size={16} />
                  <span className="truncate">Explore Assistants</span>
                </Link>
              </>
            )}
            <Separator className="mt-4" />
          </div>
        </div>
      </div>
    </>
  );
};
