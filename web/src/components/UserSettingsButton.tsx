"use client";

import { useState, useRef, useContext } from "react";
import { FiSearch, FiMessageSquare, FiTool, FiLogOut } from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@/lib/types";
import { checkUserIsNoAuthUser, logout } from "@/lib/user";
import { BasicClickable, BasicSelectable } from "@/components/BasicClickable";
import { Popover } from "./popover/Popover";
import { FaBrain } from "react-icons/fa";
import { LOGOUT_DISABLED } from "@/lib/constants";
import { Settings } from "@/app/admin/settings/interfaces";
import { SettingsContext } from "./settings/SettingsProvider";
import { ChevronsUpDown } from "lucide-react";

export function UserSettingsButton({ user }: { user: User | null }) {
  const [userInfoVisible, setUserInfoVisible] = useState(false);
  const userInfoRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleLogout = () => {
    logout().then((isSuccess) => {
      if (!isSuccess) {
        alert("Failed to logout");
      }
      router.push("/auth/login");
    });
  };

  const toPascalCase = (str: string) =>
    (str.match(/[a-zA-Z0-9]+/g) || [])
      .map((w) => `${w.charAt(0).toUpperCase()}${w.slice(1)}`)
      .join("");
  const showAdminPanel = !user || user.role === "admin";
  const showLogout =
    user && !checkUserIsNoAuthUser(user.id) && !LOGOUT_DISABLED;

  return (
    <div className="relative w-full py-2 px-4" ref={userInfoRef}>
      <Popover
        triggerMaxWidth={true}
        matchWidth={true}
        open={userInfoVisible}
        onOpenChange={setUserInfoVisible}
        content={
          <BasicClickable fullWidth>
            <div
              onClick={() => setUserInfoVisible(!userInfoVisible)}
              className="flex min-w-full items-center gap-3 cursor-pointer py-2"
            >
              <div className="flex items-center justify-center bg-white rounded-full min-h-10 min-w-10 aspect-square text-base font-normal border-2 border-gray-900 shadow-md text-default">
                {user && user.email ? user.email[0].toUpperCase() : "A"}
              </div>
              <div className="w-full h-full flex flex-col items-start justify-center truncate">
                {/* TODO: Set this as a user.name - which will be added to the schema of the user and the database schema user table */}
                <div className="flex items-center justify-between gap-1 w-full">
                  <p className="text-base font-semibold overflow-hidden text-ellipsis">
                    {user && user.email
                      ? `${toPascalCase(
                          user.email.split(".")[0]
                        )} ${toPascalCase(
                          user.email.split(".")[1].split("@")[0]
                        )}`
                      : "Admin"}
                  </p>
                  <ChevronsUpDown className="text-black" size={20} />
                </div>
                <p className="text-xs">
                  {user && user.email ? user.email : "admin@enmedd-chp.com"}
                </p>
              </div>
            </div>
          </BasicClickable>
        }
        popover={
          <div
            className={`
                z-[60]
                text-strong 
                text-sm 
                border 
                border-border 
                bg-background 
                rounded-regular 
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
            {showAdminPanel && (
              <>
                <Link
                  href="/admin/indexing/status"
                  className="flex py-3 px-4 cursor-pointer rounded hover:bg-hover-light"
                >
                  <FiTool className="my-auto mr-2 text-lg" />
                  Admin Panel
                </Link>
              </>
            )}
            {showLogout && (
              <>
                {showAdminPanel && (
                  <div className="my-1 border-t border-border" />
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
        side="top"
        align="end"
        sideOffset={10}
      />
    </div>
  );
}
