"use client";

import { logout } from "@/lib/user";
import { UserCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import React from "react";
import "tailwindcss/tailwind.css";

export const Header: React.FC = () => {
  const router = useRouter();

  return (
    <header className="bg-gray-800 text-gray-200 py-4">
      <div className="mx-auto mx-8 flex">
        <h1 className="text-2xl font-bold">danswer 💃</h1>

        <div
          className="ml-auto flex items-center cursor-pointer hover:text-red-500"
          onClick={() =>
            logout().then((isSuccess) => {
              if (!isSuccess) {
                alert("Failed to logout");
              }
              router.push("/auth/login");
            })
          }
        >
          {/* TODO: make this a dropdown with more options */}
          <UserCircle size={24} className="mr-1" />
          Logout
        </div>
      </div>
    </header>
  );
};
