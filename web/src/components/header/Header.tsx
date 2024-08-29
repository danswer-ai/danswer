"use client";

import { User } from "@/lib/types";
import Link from "next/link";
import React, { useContext } from "react";

import { FiMenu, FiMessageSquare, FiSearch } from "react-icons/fi";
import { HeaderWrapper } from "./HeaderWrapper";
import { SettingsContext } from "../settings/SettingsProvider";
import { UserDropdown } from "../UserDropdown";
import Logo from "../../../public/logo-brand.png";
import { NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_DANSWER_POWERED } from "@/lib/constants";
import { SideBar } from "../SideBar";
import Image from "next/image";

export function HeaderTitle({ children }: { children: JSX.Element | string }) {
  return <h1 className="flex text-2xl font-bold text-strong">{children}</h1>;
}

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  const combinedSettings = useContext(SettingsContext);
  if (!combinedSettings) {
    return null;
  }
  const settings = combinedSettings.settings;
  const enterpriseSettings = combinedSettings.enterpriseSettings;

  return (
    <HeaderWrapper>
      <div className="flex items-center h-full">
        <SideBar />
        <Link
          className="flex flex-col py-3"
          href={
            settings && settings.default_page === "chat" ? "/chat" : "/search"
          }
        >
          <div className="flex my-auto">
            <div className="my-auto mr-1">
              {/* TODO: Remove Enterprise Settings */}
              <Image src={Logo} alt="Logo" className="w-28" />
            </div>
            <div className="my-auto">
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
        </Link>
        {/* <HeaderTitle>enMedD CHP</HeaderTitle> */}
        {(!settings ||
          (settings.search_page_enabled && settings.chat_page_enabled)) && (
          <>
            <Link
              href="/search"
              className={"ml-6 h-full  flex-col hover:bg-hover lg:flex hidden"}
            >
              <div className="flex w-24 my-auto">
                <div className={"mx-auto flex text-strong px-2"}>
                  <FiSearch className="my-auto mr-1" />
                  <h1 className="flex my-auto text-sm font-bold">Search</h1>
                </div>
              </div>
            </Link>

            <Link
              href="/chat"
              className="flex-col hidden h-full hover:bg-hover lg:flex"
            >
              <div className="flex w-24 my-auto">
                <div className="flex px-2 mx-auto text-strong">
                  <FiMessageSquare className="my-auto mr-1" />
                  <h1 className="flex my-auto text-sm font-bold">Chat</h1>
                </div>
              </div>
            </Link>
          </>
        )}

        <div className="flex flex-col h-full ml-auto">
          <div className="my-auto">
            <UserDropdown user={user} hideChatAndSearch />
          </div>
        </div>
      </div>
    </HeaderWrapper>
  );
}
