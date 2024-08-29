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

import Logo from "../../../public/logo-brand.png";
import { HeaderTitle } from "@/components/header/Header";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_ENMEDD_POWERED } from "@/lib/constants";
import { SettingsContext } from "@/components/settings/SettingsProvider";

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

  const [isLgScreen, setIsLgScreen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const handleMediaQueryChange = (e: MediaQueryListEvent) => {
      setIsLgScreen(e.matches);
    };

    setIsLgScreen(mediaQuery.matches);

    mediaQuery.addEventListener("change", handleMediaQueryChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  const combinedSettings = useContext(SettingsContext);
  if (!combinedSettings) {
    return null;
  }
  const settings = combinedSettings.settings;
  const enterpriseSettings = combinedSettings.enterpriseSettings;

  let opacityClass = "opacity-100";

  if (isLgScreen) {
    opacityClass = isExpanded ? "lg:opacity-100 delay-200" : "lg:opacity-0";
  } else {
    opacityClass = openSidebar
      ? "opacity-100 delay-200"
      : "opacity-0 lg:opacity-100";
  }

  return (
    <>
      {popup}
      <div
        className={`py-6
            bg-background
            flex-col 
            h-full
            ease-in-out
            flex
            transition-[width] duration-500
            z-overlay
            w-full overflow-hidden lg:overflow-visible
            ${
              isExpanded
                ? "lg:w-sidebar border-r border-border"
                : "lg:w-0 border-none"
            }
            `}
        id="chat-sidebar"
      >
        <div
          className={`h-full overflow-hidden flex flex-col transition-opacity duration-300 ease-in-out ${opacityClass}`}
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
                  <HeaderTitle>
                    {enterpriseSettings.application_name}
                  </HeaderTitle>

                  {!NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_ENMEDD_POWERED && (
                    <p className="text-xs text-subtle -mt-1.5">
                      Powered by enMedD AI
                    </p>
                  )}
                </div>
              ) : (
                <></>
              )}
            </div>
            <div className="px-4 text-sm text-emphasis font-medium flex flex-col gap-1">
              {settings.search_page_enabled && (
                <Link
                  href="/search"
                  className={`flex p-2 rounded-regular cursor-pointer hover:bg-hover-light items-center gap-2 shadow-sm`}
                >
                  <Search size={16} className="min-w-4 min-h-4" />
                  Search
                </Link>
              )}
              {settings.chat_page_enabled && (
                <>
                  <Link
                    href="/chat"
                    className={`flex p-2 rounded-regular cursor-pointer hover:bg-hover-light items-center gap-2`}
                  >
                    <MessageCircleMore size={16} className="min-w-4 min-h-4" />
                    Chat
                  </Link>
                  <Link
                    href="/assistants/mine"
                    className="flex p-2 rounded-regular cursor-pointer hover:bg-hover-light items-center gap-2"
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
      </div>
    </>
  );
};
