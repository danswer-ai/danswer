"use client";

import { useState, useRef } from "react";
import { FiTool, FiLogOut } from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User as UserTypes } from "@/lib/types";
import { checkUserIsNoAuthUser, logout } from "@/lib/user";
import { LOGOUT_DISABLED } from "@/lib/constants";
import { Bell, CircleUserRound, Cpu, User } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";

export function UserSettingsButton({ user }: { user?: UserTypes | null }) {
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
    <div className="relative" ref={userInfoRef}>
      <Popover>
        <PopoverTrigger
          asChild
          onClick={() => setUserInfoVisible(!userInfoVisible)}
          className="w-full relative cursor-pointer"
        >
          <div
            className="flex items-center justify-center bg-white rounded-full min-h-10 min-w-10 max-h-10 max-w-10 aspect-square text-base font-normal border-2 border-gray-900 shadow-md text-default py-2"
            onClick={() => setUserInfoVisible(!userInfoVisible)}
          >
            {user && user.email ? user.email[0].toUpperCase() : "A"}
          </div>
        </PopoverTrigger>
        <PopoverContent className={`w-[250px] !z-[999] mb-2 ml-4 text-sm`}>
          <div className="w-full text-black-800">
            <>
              <Link
                href=""
                className="flex py-3 px-4 cursor-pointer rounded hover:bg-primary hover:text-white items-center gap-3 group"
              >
                <CircleUserRound
                  size={40}
                  className="min-w-10 min-h-10"
                  strokeWidth={1}
                />
                <div className="flex flex-col w-[160px]">
                  <span className="text-dark-700 truncate group-hover:text-white">
                    Johny Doe
                  </span>
                  <span className="text-dark-500 truncate group-hover:text-white">
                    johnydoe@gmail.com
                  </span>
                </div>
              </Link>
              <div className="my-1 border-b border-border" />
            </>
            <Link
              href="/admin/indexing/status"
              className="flex py-3 px-4 cursor-pointer rounded hover:bg-primary hover:text-white"
            >
              <User className="my-auto mr-3" size={24} strokeWidth={1.5} />
              Profile Settings
            </Link>
            {showAdminPanel && (
              <>
                <Link
                  href="/admin/indexing/status"
                  className="flex py-3 px-4 cursor-pointer rounded hover:bg-primary hover:text-white"
                >
                  <FiTool
                    className="my-auto mr-3"
                    size={24}
                    strokeWidth={1.5}
                  />
                  Admin Panel
                </Link>
              </>
            )}
            <Link
              href="/admin/indexing/status"
              className="flex py-3 px-4 cursor-pointer rounded hover:bg-primary hover:text-white"
            >
              <Cpu className="my-auto mr-3" size={24} strokeWidth={1.5} />
              My Assistant
            </Link>
            <Link
              href="/admin/indexing/status"
              className="flex py-3 px-4 cursor-pointer rounded hover:bg-primary hover:text-white"
            >
              <Bell className="my-auto mr-3" size={24} strokeWidth={1.5} />
              Notification
            </Link>
            {showLogout && (
              <>
                {showAdminPanel && (
                  <div className="my-1 border-t border-border" />
                )}
                <div
                  onClick={handleLogout}
                  className="mt-1 flex py-3 px-4 cursor-pointer hover:bg-primary hover:text-white rounded"
                >
                  <FiLogOut
                    className="my-auto mr-3"
                    size={24}
                    strokeWidth={1.5}
                  />
                  Log out
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
/* "use client";

import { useState, useRef } from "react";
import { FiTool, FiLogOut } from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User as UserTypes } from "@/lib/types";
import { checkUserIsNoAuthUser, logout } from "@/lib/user";
import { LOGOUT_DISABLED } from "@/lib/constants";
import { Bell, CircleUserRound, Cpu, User } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";

export function UserSettingsButton({ user }: { user: UserTypes | null }) {
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
    <div className="relative" ref={userInfoRef}>
      <Popover>
        <PopoverTrigger
          asChild
          onClick={() => setUserInfoVisible(!userInfoVisible)}
          className="w-full relative cursor-pointer"
        >
          <div
            className="flex items-center justify-center bg-white rounded-full min-h-10 min-w-10 max-h-10 max-w-10 aspect-square text-base font-normal border-2 border-gray-900 shadow-md text-default py-2"
            onClick={() => setUserInfoVisible(!userInfoVisible)}
          >
            {user && user.email ? user.email[0].toUpperCase() : "A"}
          </div>
        </PopoverTrigger>
        <PopoverContent className={`w-[250px] !z-[999] mb-2 ml-4 text-sm`}>
          <div className="w-full text-black-800">
            <>
              <Link
                href=""
                className="flex py-3 px-4 cursor-pointer rounded hover:bg-primary hover:text-white items-center gap-3 group"
              >
                <CircleUserRound
                  size={40}
                  className="min-w-10 min-h-10"
                  strokeWidth={1}
                />
                <div className="flex flex-col w-[160px]">
                  <span className="text-dark-700 truncate group-hover:text-white">
                    Johny Doe
                  </span>
                  <span className="text-dark-500 truncate group-hover:text-white">
                    johnydoe@gmail.com
                  </span>
                </div>
              </Link>
              <div className="my-1 border-b border-border" />
            </>
            <Link
              href="/admin/indexing/status"
              className="flex py-3 px-4 cursor-pointer rounded hover:bg-primary hover:text-white"
            >
              <User className="my-auto mr-3" size={24} strokeWidth={1.5} />
              Profile Settings
            </Link>
            {showAdminPanel && (
              <>
                <Link
                  href="/admin/indexing/status"
                  className="flex py-3 px-4 cursor-pointer rounded hover:bg-primary hover:text-white"
                >
                  <FiTool
                    className="my-auto mr-3"
                    size={24}
                    strokeWidth={1.5}
                  />
                  Admin Panel
                </Link>
              </>
            )}
            <Link
              href="/admin/indexing/status"
              className="flex py-3 px-4 cursor-pointer rounded hover:bg-primary hover:text-white"
            >
              <Cpu className="my-auto mr-3" size={24} strokeWidth={1.5} />
              My Assistant
            </Link>
            <Link
              href="/admin/indexing/status"
              className="flex py-3 px-4 cursor-pointer rounded hover:bg-primary hover:text-white"
            >
              <Bell className="my-auto mr-3" size={24} strokeWidth={1.5} />
              Notification
            </Link>
            {showLogout && (
              <>
                {showAdminPanel && (
                  <div className="my-1 border-t border-border" />
                )}
                <div
                  onClick={handleLogout}
                  className="mt-1 flex py-3 px-4 cursor-pointer hover:bg-primary hover:text-white rounded"
                >
                  <FiLogOut
                    className="my-auto mr-3"
                    size={24}
                    strokeWidth={1.5}
                  />
                  Log out
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
 */
