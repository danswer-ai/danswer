"use client";

import { useState, useRef, useContext } from "react";
import { FiSearch, FiMessageSquare, FiTool, FiLogOut } from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@/lib/types";
import { checkUserIsNoAuthUser, logout } from "@/lib/user";
import { BasicSelectable } from "@/components/BasicClickable";
import { Popover } from "./popover/Popover";
import { FaBrain } from "react-icons/fa";
import { LOGOUT_DISABLED } from "@/lib/constants";
import { Settings } from "@/app/admin/settings/interfaces";
import { SettingsContext } from "./settings/SettingsProvider";
import { LightSettingsIcon } from "./icons/icons";

export function UserDropdown({
  user,
  hideChatAndSearch,
}: {
  user: User | null;
  hideChatAndSearch?: boolean;
}) {
  const [userInfoVisible, setUserInfoVisible] = useState(false);
  const userInfoRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const combinedSettings = useContext(SettingsContext);
  if (!combinedSettings) {
    return null;
  }
  const settings = combinedSettings.settings;

  const handleLogout = () => {
    logout().then((isSuccess) => {
      if (!isSuccess) {
        alert("Failed to logout");
      }
      router.push("/auth/login");
    });
  };

  const showAdminPanel = !user || user.role === "admin";
  const showLogout =
    user && !checkUserIsNoAuthUser(user.id) && !LOGOUT_DISABLED;

  return (
    <div className="group relative" ref={userInfoRef}>
      <Popover
        open={userInfoVisible}
        onOpenChange={setUserInfoVisible}
        content={
          <div
            onClick={() => setUserInfoVisible(!userInfoVisible)}
            className="flex cursor-pointer"
          >
            <div className="my-auto  bg-background-strong  ring-2 ring-transparent group-hover:ring-background-stronger/50 transition-ring duration-150  rounded-lg  inline-block flex-none px-2 text-base font-normal">
              {user && user.email ? user.email[0].toUpperCase() : "A"}
            </div>
          </div>
        }
        popover={
          <div
            className={`
              p-2
              min-w-[200px]
                text-strong 
                text-sm
                border 
                border-border 
                bg-background
                rounded-lg
                shadow-lg 
                flex 
                flex-col 
                w-full 
                max-h-96 
                overflow-y-auto 
                p-1
                overscroll-contain
              `}
          >
            {!hideChatAndSearch && (
              <>
                {settings.chat_page_enabled && (
                  <>
                    <Link
                      href="/assistants/mine"
                      className="flex py-3 px-4 rounded cursor-pointer hover:bg-hover-light"
                    >
                      <svg
                        className="h-5 w-5 text-neutral-500 my-auto mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        width="200"
                        height="200"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="none"
                          stroke="currentColor"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.5"
                          d="M17.928 19.634h2.138a1.165 1.165 0 0 0 1.116-1.555a6.851 6.851 0 0 0-6.117-3.95m0-2.759a3.664 3.664 0 0 0 3.665-3.664a3.664 3.664 0 0 0-3.665-3.674m-1.04 16.795a1.908 1.908 0 0 0 1.537-3.035a8.026 8.026 0 0 0-6.222-3.196a8.026 8.026 0 0 0-6.222 3.197a1.909 1.909 0 0 0 1.536 3.034zM9.34 11.485a4.16 4.16 0 0 0 4.15-4.161a4.151 4.151 0 0 0-8.302 0a4.16 4.16 0 0 0 4.151 4.16"
                        />
                      </svg>
                      My Assistants
                    </Link>
                  </>
                )}
              </>
            )}
            {showAdminPanel && (
              <>
                <Link
                  href="/admin/indexing/status"
                  className="flex py-3 px-4 cursor-pointer rounded hover:bg-hover-light"
                >
                  <LightSettingsIcon className="h-5 w-5 text-neutral-500 my-auto mr-2" />
                  Admin Panel
                </Link>
              </>
            )}
            {showLogout && (
              <>
                {(!hideChatAndSearch || showAdminPanel) && (
                  <div className="border-t border-border my-1" />
                )}
                <div
                  onClick={handleLogout}
                  className="mt-1 flex py-3 px-4 cursor-pointer hover:bg-hover-light"
                >
                  <FiLogOut className="my-auto mr-2 text-lg" />
                  Log out
                </div>
              </>
            )}
          </div>
        }
        side="bottom"
        align="end"
        sideOffset={5}
        alignOffset={-10}
      />
    </div>
  );
}
