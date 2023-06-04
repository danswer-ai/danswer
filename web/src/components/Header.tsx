"use client";

import { User } from "@/lib/types";
import { logout } from "@/lib/user";
import { UserCircle } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

interface HeaderProps {
  user: User | null;
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout().then((isSuccess) => {
      if (!isSuccess) {
        alert("Failed to logout");
      }
      router.push("/auth/login");
    });
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

  return (
    <header className="bg-gray-800 text-gray-200 py-4">
      <div className="mx-8 flex">
        <Link href="/">
          <div className="flex">
            <div className="h-[32px] w-[30px]">
              <Image src="/logo.png" alt="Logo" width="1419" height="1520" />
            </div>
            <h1 className="flex text-2xl font-bold my-auto">Danswer</h1>
          </div>
        </Link>

        <div
          className="ml-auto flex items-center cursor-pointer relative"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          ref={dropdownRef}
        >
          <UserCircle size={24} className="mr-1 hover:text-red-500" />
          {dropdownOpen && (
            <div
              className={
                "absolute top-10 right-0 mt-2 bg-gray-600 rounded-sm " +
                "w-48 overflow-hidden shadow-xl z-10 text-sm text-gray-300"
              }
            >
              <Link href="/user/connectors">
                <div className="flex py-2 px-3 cursor-pointer hover:bg-gray-500 border-b border-gray-500">
                  Personal Connectors
                </div>
              </Link>
              {/* Show connector option if (1) auth is disabled or (2) user is an admin */}
              {(!user || user.role === "admin") && (
                <Link href="/admin/indexing/status">
                  <div className="flex py-2 px-3 cursor-pointer hover:bg-gray-500 border-b border-gray-500">
                    Admin Panel
                  </div>
                </Link>
              )}
              {user && (
                <div
                  className="flex py-2 px-3 cursor-pointer hover:bg-gray-500"
                  onClick={handleLogout}
                >
                  Logout
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
