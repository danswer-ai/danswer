"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChatIcon, SearchIcon } from "@/components/icons/icons";

const ToggleSwitch = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("activeTab") || "chat";
    }
    return "chat";
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const newTab = pathname === "/search" ? "search" : "chat";
    setActiveTab(newTab);
    localStorage.setItem("activeTab", newTab);
    setIsInitialLoad(false);
  }, [pathname]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem("activeTab", tab);
    router.push(tab === "search" ? "/search" : "/chat");
  };

  return (
    <div className="bg-gray-100 flex rounded-full p-1">
      <div
        className={`absolute top-1 bottom-1 w-1/2 bg-white rounded-full shadow ${
          isInitialLoad ? "" : "transition-transform duration-300 ease-in-out"
        } ${activeTab === "chat" ? "translate-x-[100%]" : "translate-x-0"}`}
      />
      <button
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ease-in-out flex items-center relative z-10 ${
          activeTab === "search"
            ? "text-gray-800"
            : "text-gray-500 hover:text-gray-700"
        }`}
        onClick={() => handleTabChange("search")}
      >
        <SearchIcon className="!w-4 !h-4 mr-2" />
        Search
        <span className="text-xs ml-2">⌘S</span>
      </button>
      <button
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ease-in-out flex items-center relative z-10 ${
          activeTab === "chat"
            ? "text-gray-800"
            : "text-gray-500 hover:text-gray-700"
        }`}
        onClick={() => handleTabChange("chat")}
      >
        <ChatIcon className="!w-4 !h-4 mr-2" />
        Chat
        <span className="text-xs ml-2">⌘D</span>
      </button>
    </div>
  );
};

export default function FunctionalWrapper({
  // children,
  content,
  initiallyTogggled,
}: {
  // children: React.ReactNode;
  content: (toggle: (toggled: boolean) => void) => ReactNode;
  initiallyTogggled: boolean;
}) {
  const router = useRouter();
  const [sidebarToggled, setSidebarToggled] = useState(initiallyTogggled);

  const toggle = (toggled: boolean) => {
    setSidebarToggled(toggled);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        const newPage = event.shiftKey;
        switch (event.key.toLowerCase()) {
          case "d":
            event.preventDefault();
            if (newPage) {
              window.open("/chat", "_blank");
            } else {
              router.push("/chat");
            }
            break;
          case "s":
            event.preventDefault();
            if (newPage) {
              window.open("/search", "_blank");
            } else {
              router.push("/search");
            }
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [router]);

  return (
    <>
      <div className="z-[40] flex fixed top-4 left-1/2 transform -translate-x-1/2">
        <div
          style={{ transition: "width 0.30s ease-out" }}
          className={`
        flex-none 
        overflow-y-hidden 
        bg-background-weak 
        transition-all 
        bg-opacity-80
        duration-300 
        ease-in-out
        h-full
        ${sidebarToggled ? "w-[300px] " : "w-[0px]"}
      `}
        ></div>
        <div className="relative">
          <ToggleSwitch />
        </div>
      </div>
      <div className="absolute left-0 top-0 w-full h-full">
        {content(toggle)}
      </div>
    </>
  );
}
