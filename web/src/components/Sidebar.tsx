"use client";

import {
  FiBook,
  FiEdit,
  FiFolderPlus,
  FiMenu,
  FiPlusSquare,
  FiX,
} from "react-icons/fi";
import { ReactNode, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { SettingsContext } from "@/components/settings/SettingsProvider";

interface SidebarProps {
  onToggle?: () => void;
  isOpen: boolean;
  children: ReactNode;
  width?: string;
  wideWidth?: string;
  padded?: boolean;
}

export default function Sidebar({
  onToggle,
  isOpen,
  children,
  width = "w-64",
  wideWidth = "3xl:w-72",
  padded,
}: SidebarProps) {
  const combinedSettings = useContext(SettingsContext);
  if (!combinedSettings) {
    return null;
  }
  const isMobile = combinedSettings.isMobile;

  const sidebarClasses = `
      ${width} ${wideWidth}
      flex flex-none
      bg-background-weak
      border-r border-border
      flex flex-col
      h-screen
      transition-transform duration-300 ease-in-out
      ${
        isMobile
          ? `fixed top-0 left-0 z-40 ${padded && "mt-16 pt-4"} ${isOpen ? "translate-x-0" : "-translate-x-full"} shadow-lg`
          : "translate-x-0"
      }
    `;

  return (
    <div className={sidebarClasses} id="sidebar">
      {children}
      {isMobile && onToggle && (
        <button
          onClick={onToggle}
          className="absolute top-4 right-4 text-strong"
          aria-label="Close sidebar"
        >
          <FiX size={24} />
        </button>
      )}
    </div>
  );
}
