"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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
      {/* Animated background */}
      <div
        className={`absolute top-1 bottom-1 w-1/2 bg-white rounded-full shadow ${
          isInitialLoad ? "" : "transition-transform duration-300 ease-in-out"
        } ${activeTab === "chat" ? "translate-x-full" : "translate-x-0"}`}
      />
      <button
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ease-in-out flex items-center relative z-10 ${
          activeTab === "search"
            ? "text-gray-800"
            : "text-gray-500 hover:text-gray-700"
        }`}
        onClick={() => handleTabChange("search")}
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
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
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
        </svg>
        Chat
        <span className="text-xs ml-2">⌘D</span>
      </button>
    </div>
  );
};

export default function FunctionalWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case "d":
            event.preventDefault();
            router.push("/chat");
            break;
          case "s":
            event.preventDefault();
            router.push("/search");
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
      {/* <div className="z-[40] absolute top-4 left-1/2 transform -translate-x-1/2"> */}

      <div className="z-[40] fixed top-4 left-1/2 transform -translate-x-1/2">
        <ToggleSwitch />
      </div>
      <div className="absolute left-0 top-0 w-full h-full">{children}</div>
    </>
  );
}
