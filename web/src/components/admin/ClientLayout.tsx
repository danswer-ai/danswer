"use client";

import { AdminSidebar } from "@/components/admin/connectors/AdminSidebar";
import {
  NotebookIcon,
  UsersIcon,
  ThumbsUpIcon,
  BookmarkIcon,
  ZoomInIcon,
  RobotIcon,
  ConnectorIcon,
} from "@/components/icons/icons";
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
    console.log(isOpenAdminSidebar);
    setIsOpenAdminSidebar((isOpenAdminSidebar) => !isOpenAdminSidebar);
  };

  return (
    <div className="h-screen overflow-y-hidden">
      <div className="absolute top-0 z-50 w-full">
        <Header user={user} />
      </div>
      <div className="flex h-full pt-16">
        <div className="w-80  bg-background-weak pt-12 pb-8 h-full border-r border-border overflow-auto">
          <AdminSidebar
            isOpen={isOpenAdminSidebar}
            toggleAdminSidebar={toggleAdminSidebar}
            collections={[
              {
                name: "Connectors",
                items: [
                  {
                    name: (
                      <div className="flex">
                        <NotebookIcon size={18} />
                        <div className="ml-1">Existing Connectors</div>
                      </div>
                    ),
                    link: "/admin/indexing/status",
                  },
                  {
                    name: (
                      <div className="flex">
                        <ConnectorIcon size={18} />
                        <div className="ml-1.5">Add Connector</div>
                      </div>
                    ),
                    link: "/admin/add-connector",
                  },
                ],
              },
              {
                name: "Document Management",
                items: [
                  {
                    name: (
                      <div className="flex">
                        <BookmarkIcon size={18} />
                        <div className="ml-1">Document Sets</div>
                      </div>
                    ),
                    link: "/admin/documents/sets",
                  },
                  {
                    name: (
                      <div className="flex">
                        <ZoomInIcon size={18} />
                        <div className="ml-1">Explorer</div>
                      </div>
                    ),
                    link: "/admin/documents/explorer",
                  },
                  {
                    name: (
                      <div className="flex">
                        <ThumbsUpIcon size={18} />
                        <div className="ml-1">Feedback</div>
                      </div>
                    ),
                    link: "/admin/documents/feedback",
                  },
                ],
              },
              {
                name: "Custom Assistants",
                items: [
                  {
                    name: (
                      <div className="flex">
                        <RobotIcon size={18} />
                        <div className="ml-1">Assistants</div>
                      </div>
                    ),
                    link: "/admin/assistants",
                  },
                  {
                    name: (
                      <div className="flex">
                        <FiSlack size={18} />
                        <div className="ml-1">Slack Bots</div>
                      </div>
                    ),
                    link: "/admin/bot",
                  },
                  {
                    name: (
                      <div className="flex">
                        <FiTool size={18} className="my-auto" />
                        <div className="ml-1">Tools</div>
                      </div>
                    ),
                    link: "/admin/tools",
                  },
                ],
              },
              {
                name: "Model Configs",
                items: [
                  {
                    name: (
                      <div className="flex">
                        <FiCpu size={18} />
                        <div className="ml-1">LLM</div>
                      </div>
                    ),
                    link: "/admin/models/llm",
                  },
                  {
                    name: (
                      <div className="flex">
                        <FiPackage size={18} />
                        <div className="ml-1">Embedding</div>
                      </div>
                    ),
                    link: "/admin/models/embedding",
                  },
                ],
              },
              {
                name: "User Management",
                items: [
                  {
                    name: (
                      <div className="flex">
                        <UsersIcon size={18} />
                        <div className="ml-1">Users</div>
                      </div>
                    ),
                    link: "/admin/users",
                  },
                ],
              },
              {
                name: "Settings",
                items: [
                  {
                    name: (
                      <div className="flex">
                        <FiSettings size={18} />
                        <div className="ml-1">Workspace Settings</div>
                      </div>
                    ),
                    link: "/admin/settings",
                  },
                ],
              },
            ]}
          />
        </div>
        <div className="px-12 pt-8 pb-8 h-full overflow-y-auto w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
