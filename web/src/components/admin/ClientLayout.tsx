"use client";

import { AdminSidebar } from "@/components/admin/connectors/AdminSidebar";
import { User } from "@/lib/types";
import { FiCpu, FiPackage, FiSettings, FiSlack, FiTool } from "react-icons/fi";
import { useState } from "react";
import { Header } from "../header/Header";

export function ClientLayout({
  user,
  children,
}: {
  user: User | null;
  children: React.ReactNode;
}) {
  const [isOpenAdminSidebar, setIsOpenAdminSidebar] = useState(false);
  const toggleAdminSidebar = () => {
    setIsOpenAdminSidebar((isOpenAdminSidebar) => !isOpenAdminSidebar);
  };

  return (
    <div className="h-screen overflow-y-hidden">
      <div className="absolute top-0 z-50 w-full">
        <Header
          hideToggle={isOpenAdminSidebar}
          toggleSidebar={toggleAdminSidebar}
          user={user}
        />
      </div>
      <div className="flex h-full bg-background ">
        <AdminSidebar
          hideonDesktop
          isOpen={isOpenAdminSidebar}
          toggleAdminSidebar={toggleAdminSidebar}
        />

        <div className="px-12 pt-24 pb-8 h-full overflow-y-auto w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
