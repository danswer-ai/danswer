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
                      <svg className="h-5 w-5 text-neutral-500 my-auto mr-2" xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24">
                        <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.928 19.634h2.138a1.165 1.165 0 0 0 1.116-1.555a6.851 6.851 0 0 0-6.117-3.95m0-2.759a3.664 3.664 0 0 0 3.665-3.664a3.664 3.664 0 0 0-3.665-3.674m-1.04 16.795a1.908 1.908 0 0 0 1.537-3.035a8.026 8.026 0 0 0-6.222-3.196a8.026 8.026 0 0 0-6.222 3.197a1.909 1.909 0 0 0 1.536 3.034zM9.34 11.485a4.16 4.16 0 0 0 4.15-4.161a4.151 4.151 0 0 0-8.302 0a4.16 4.16 0 0 0 4.151 4.16" />
                      </svg>



                      {/* <FaBrain className="my-auto mr-2 text-lg" /> */}
                      My Assistants
                    </Link>
                  </>
                )}
              </>
            )}
            {showAdminPanel && (
              <>
                {/* {!hideChatAndSearch && (
                  <div className="border-t border-border my-1" />
                )} */}
                {/* <div className="border-t border-border my-1" /> */}
                {/* <div></div> */}
                <Link
                  href="/admin/indexing/status"
                  className="flex py-3 px-4 cursor-pointer rounded hover:bg-hover-light"
                >
                  <svg className="h-5 w-5 text-neutral-500 my-auto mr-2" xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24">
                    <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">
                      <path d="M12.132 15.404a3.364 3.364 0 1 0 0-6.728a3.364 3.364 0 0 0 0 6.728" />
                      <path d="M20.983 15.094a9.43 9.43 0 0 1-1.802 3.1l-2.124-.482a7.245 7.245 0 0 1-2.801 1.56l-.574 2.079a9.462 9.462 0 0 1-1.63.149a9.117 9.117 0 0 1-2.032-.23l-.609-2.146a7.475 7.475 0 0 1-2.457-1.493l-2.1.54a9.357 9.357 0 0 1-1.837-3.33l1.55-1.722a7.186 7.186 0 0 1 .069-2.652L3.107 8.872a9.356 9.356 0 0 1 2.067-3.353l2.17.54A7.68 7.68 0 0 1 9.319 4.91l.574-2.124a8.886 8.886 0 0 1 2.17-.287c.585 0 1.17.054 1.745.16l.551 2.113c.83.269 1.608.68 2.296 1.217l2.182-.563a9.368 9.368 0 0 1 2.043 3.1l-1.48 1.607a7.405 7.405 0 0 1 .068 3.364z" />
                    </g>
                  </svg>
                  {/* <FiTool className="my-auto mr-2 text-lg" /> */}
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
        alignOffset={- 10}
      />
    </div >
  );
}
