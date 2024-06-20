"use client";

import { User } from "@/lib/types";
import { logout } from "@/lib/user";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useContext, useEffect, useRef, useState } from "react";
import { CustomDropdown, DefaultDropdownElement } from "../Dropdown";
import { FiMessageSquare, FiSearch } from "react-icons/fi";
import { HeaderWrapper } from "./HeaderWrapper";
import { SettingsContext } from "../settings/SettingsProvider";
import { UserDropdown } from "../UserDropdown";
import { SUB_HEADER } from "@/lib/constants";

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  const combinedSettings = useContext(SettingsContext);
  if (!combinedSettings) {
    return null;
  }
  const settings = combinedSettings.settings;

  return (
    <HeaderWrapper>
      <div className="flex h-full">
        <div className={`${SUB_HEADER} flex items-end`}>
          <Link
            href={
              settings && settings.default_page === "chat" ? "/chat" : "/search"
            }
          >
            <div className="flex items-end">
              <div className="h-[32px] w-[30px]">
                <Image src="/logo.png" alt="Logo" width="1419" height="1520" />
              </div>
              <h1 className="inline-block leading-none text-2xl text-strong font-bold mt-auto">
                Danswer
              </h1>
            </div>
          </Link>
        </div>

        {(!settings ||
          (settings.search_page_enabled && settings.chat_page_enabled)) && (
            <>
              <Link
                href="/search"
                className={"ml-6 h-full flex flex-col hover:bg-hover"}
              >
                <div className={`${SUB_HEADER} flex items-end`}>
                  <div className="w-24 flex ">
                    <div className={"mx-auto flex text-strong px-2"}>
                      <FiSearch className="my-auto mr-1" />
                      <h1 className="flex text-sm font-bold my-auto">Search</h1>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/chat" className="h-full flex flex-col hover:bg-hover">
                <div className={`${SUB_HEADER} flex items-end`}>
                  <div className="w-24 flex ">
                    <div className="mx-auto flex text-strong px-2">
                      <FiMessageSquare className="my-auto mr-1" />
                      <h1 className="flex text-sm font-bold my-auto">Chat</h1>
                    </div>
                  </div>
                </div>
              </Link>
            </>
          )}

        <div className="ml-auto h-full flex flex-col">
          <div className={`${SUB_HEADER} flex items-end`}>
              <UserDropdown user={user} hideChatAndSearch />
          </div>
        </div>
      </div>
    </HeaderWrapper>
  );
}

/* 

*/
