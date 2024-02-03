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
import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme} from "@/app/ThemeContext";

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    const response = await logout();
    if (!response.ok) {
      alert("Failed to logout");
    }
    // disable auto-redirect immediately after logging out so the user
    // is not immediately re-logged in
    router.push("/auth/login?disableAutoRedirect=true");
  };

  // When dropdownOpen state changes, it attaches/removes the click listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("click", handleClickOutside);
    } else {
      document.removeEventListener("click", handleClickOutside);
    }

    // Clean up function to remove listener when component unmounts
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [dropdownOpen]);

  const combinedSettings = useContext(SettingsContext);
  if (!combinedSettings) {
    return null;
  }
  const settings = combinedSettings.settings;

  return (
    <HeaderWrapper>
      <div className="flex h-full">
        <Link
          className="py-4"
          href={
            settings && settings.default_page === "chat" ? "/chat" : "/search"
          }
        >
          <div className="flex">
            <div className="h-[32px] w-[30px]">
              <Image src="/logo.png" alt="Logo" width="1419" height="1520" />
            </div>
            <h1 className="flex text-2xl text-strong dark:text-strong-dark font-bold my-auto dark:text-neutral-400">
              Danswer
            </h1>
          </div>
        </Link>

        {(!settings ||
          (settings.search_page_enabled && settings.chat_page_enabled)) && (
          <>
            <Link
              href="/search"
              className={"ml-6 h-full flex flex-col hover:bg-hover dark:hover:bg-neutral-800"}
            >
              <div className="w-24 flex my-auto">
                <div className={"mx-auto flex text-strong dark:text-strong-dark px-2"}>
                  <FiSearch className="my-auto mr-1" />
                  <h1 className="flex text-sm font-bold my-auto dark:text-neutral-400">Search</h1>
                </div>
              </div>
            </Link>

            <Link href="/chat" className="h-full flex flex-col hover:bg-hover dark:hover:bg-neutral-800">
              <div className="w-24 flex my-auto">
                <div className="mx-auto flex text-strong dark:text-strong-dark px-2">
                  <FiMessageSquare className="my-auto mr-1" />
                  <h1 className="flex text-sm font-bold my-auto dark:text-neutral-400">Chat</h1>
                </div>
              </div>
            </Link>
          </>
        )}

        <div className="ml-auto h-full flex flex-col">
          <div className="my-auto flex items-center">
            <button onClick={toggleTheme} className="my-auto mr-4">
              {theme === 'dark' ? <FiSun size={20}/> : <FiMoon size={20}/>}
            </button>
            <CustomDropdown
              dropdown={
                <div
                    className={
                        "absolute right-0 mt-2 bg-background dark:bg-neutral-800 rounded border border-border dark:border-neutral-900 " +
                        "w-48 overflow-hidden shadow-xl z-10 text-sm"
                    }
                >
                  {/* Show connector option if (1) auth is disabled or (2) user is an admin */}
                  {(!user || user.role === "admin") && (
                      <Link href="/admin/indexing/status">
                        <DefaultDropdownElement name="Admin Panel"/>
                      </Link>
                  )}
                  {user && (
                      <DefaultDropdownElement
                          name="Logout"
                          onSelect={handleLogout}
                      />
                  )}
                </div>
              }
            >
              <div className="hover:bg-hover dark:hover:bg-neutral-800 rounded p-1 w-fit cursor-pointer">
                <div className="my-auto bg-user text-sm rounded-lg px-1.5 select-none dark:text-neutral-900">
                  {user && user.email ? user.email[0].toUpperCase() : "A"}
                </div>
              </div>
            </CustomDropdown>
          </div>
        </div>
      </div>
    </HeaderWrapper>
  );
}

/* 

*/
