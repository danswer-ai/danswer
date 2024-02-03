"use client";

import {
  FiLogOut,
  FiMessageSquare,
  FiMoreHorizontal,
  FiPlusSquare,
  FiSearch,
  FiTool,
} from "react-icons/fi";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@/lib/types";
import { logout } from "@/lib/user";
import { BasicClickable, BasicSelectable } from "@/components/BasicClickable";
import Image from "next/image";
import { ChatSessionDisplay } from "./SessionDisplay";
import { ChatSession } from "../interfaces";
import { groupSessionsByDateRange } from "../lib";
import { HEADER_PADDING } from "@/lib/constants";

interface ChatSidebarProps {
  existingChats: ChatSession[];
  currentChatId: number | null;
  user: User | null;
}

export const ChatSidebar = ({
  existingChats,
  currentChatId,
  user,
}: ChatSidebarProps) => {
  const router = useRouter();

  const groupedChatSessions = groupSessionsByDateRange(existingChats);

  const [userInfoVisible, setUserInfoVisible] = useState(false);
  const userInfoRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout().then((isSuccess) => {
      if (!isSuccess) {
        alert("Failed to logout");
      }
      router.push("/auth/login");
    });
  };

  // hides logout popup on any click outside
  const handleClickOutside = (event: MouseEvent) => {
    if (
      userInfoRef.current &&
      !userInfoRef.current.contains(event.target as Node)
    ) {
      setUserInfoVisible(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      className={`
        w-72
        2xl:w-80
        ${HEADER_PADDING}
        border-r dark:border-r-border-dark 
        border-border dark:border-neutral-900 
        flex 
        flex-col 
        h-screen
        transition-transform 
        dark:bg-background-emphasis-dark`}
      id="chat-sidebar"
    >
      <Link href="/chat" className="mx-3 mt-5">
        <BasicClickable fullWidth>
          <div className="flex text-sm">
            <FiPlusSquare className="my-auto mr-2" /> New Chat
          </div>
        </BasicClickable>
      </Link>

      <div className="mt-1 pb-1 mb-1 ml-3 overflow-y-auto h-full">
        {Object.entries(groupedChatSessions).map(
          ([dateRange, chatSessions]) => {
            if (chatSessions.length > 0) {
              return (
                <div key={dateRange}>
                  <div className="text-xs text-subtle dark:text-neutral-400 flex pb-0.5 mb-1.5 mt-5 font-bold">
                    {dateRange}
                  </div>
                  {chatSessions.map((chat) => {
                    const isSelected = currentChatId === chat.id;
                    return (
                      <div key={chat.id} className="mr-3">
                        <ChatSessionDisplay
                          chatSession={chat}
                          isSelected={isSelected}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            }
          }
        )}
        {/* {existingChats.map((chat) => {
          const isSelected = currentChatId === chat.id;
          return (
            <div key={chat.id} className="mr-3">
              <ChatSessionDisplay chatSession={chat} isSelected={isSelected} />
            </div>
          );
        })} */}
      </div>

      <div
        className="mt-auto py-2 border-t dark:border-t-border-dark border-border dark:border-neutral-900 px-3"
        ref={userInfoRef}
      >
        <div className="relative text-strong dark:text-strong-dark">
          {userInfoVisible && (
            <div
              className={
                (user ? "translate-y-[-110%]" : "translate-y-[-115%]") +
                " absolute top-0 bg-background dark:bg-neutral-800 border border-border dark:border-neutral-900 z-30 w-full rounded text-strong dark:text-strong-dark text-sm"
              }
            >
              <Link
                href="/search"
                className="flex py-3 px-4 cursor-pointer hover:bg-hover dark:hover:bg-neutral-800"
              >
                <FiSearch className="my-auto mr-2" />
                Danswer Search
              </Link>
              <Link
                href="/chat"
                className="flex py-3 px-4 cursor-pointer hover:bg-hover dark:hover:bg-neutral-800"
              >
                <FiMessageSquare className="my-auto mr-2" />
                Danswer Chat
              </Link>
              {(!user || user.role === "admin") && (
                <Link
                  href="/admin/indexing/status"
                  className="flex py-3 px-4 cursor-pointer border-t dark:border-t-border-dark border-border dark:border-neutral-900 hover:bg-hover dark:hover:bg-neutral-800"
                >
                  <FiTool className="my-auto mr-2" />
                  Admin Panel
                </Link>
              )}
              {user && (
                <div
                  onClick={handleLogout}
                  className="flex py-3 px-4 cursor-pointer border-t dark:border-t-border-dark border-border dark:border-neutral-900 rounded hover:bg-hover dark:hover:bg-neutral-800"
                >
                  <FiLogOut className="my-auto mr-2" />
                  Log out
                </div>
              )}
            </div>
          )}
          <BasicSelectable fullWidth selected={false}>
            <div
              onClick={() => setUserInfoVisible(!userInfoVisible)}
              className="flex h-8"
            >
              <div className="my-auto mr-2 bg-user rounded-lg px-1.5">
                {user && user.email ? user.email[0].toUpperCase() : "A"}
              </div>
              <p className="my-auto">
                {user ? user.email : "Anonymous Possum"}
              </p>
              <FiMoreHorizontal className="my-auto ml-auto mr-2" size={20} />
            </div>
          </BasicSelectable>
        </div>
      </div>
    </div>
  );
};
