"use client";

import { User } from "@/lib/types";
import { logout } from "@/lib/user";
import { UserCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

interface HeaderProps {
  user: User;
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
          <h1 className="text-2xl font-bold">danswer 💃</h1>
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
                "w-36 overflow-hidden shadow-xl z-10 text-sm text-gray-300"
              }
            >
              {user.role === "admin" && (
                <Link href="/admin/connectors/slack">
                  <div className="flex py-2 px-3 cursor-pointer hover:bg-gray-500 border-b border-gray-500">
                    Connectors
                  </div>
                </Link>
              )}
              <div
                className="flex py-2 px-3 cursor-pointer hover:bg-gray-500"
                onClick={handleLogout}
              >
                Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
