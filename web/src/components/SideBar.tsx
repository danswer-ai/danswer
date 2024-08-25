import { FiMessageSquare, FiSearch, FiX } from "react-icons/fi";
import {
  BookmarkIcon,
  ConnectorIcon,
  DatabaseIcon,
  GroupsIcon,
  KeyIcon,
  NotebookIcon,
  RobotIcon,
  ThumbsUpIcon,
  UsersIcon,
  ZoomInIcon,
} from "./icons/icons";
import enmeddLogo from "../../public/logo-brand.png";
import { SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED } from "@/lib/constants";
import { AdminSidebar } from "./admin/connectors/AdminSidebar";
import Image from "next/image";
import Link from "next/link";
import {
  Cpu,
  Package,
  Settings,
  Shield,
  Wrench,
  Image as ImageIcon,
  Activity,
} from "lucide-react";

interface SideBarProps {
  isHeader?: boolean;
  handleClose?: () => void;
}

export const SideBar: React.FC<SideBarProps> = ({ isHeader, handleClose }) => {
  return (
    <div
      className={`${
        isHeader
          ? "bg-background-weak h-full z-[9999] fixed top-0 left-0 pb-16 w-screen md:w-80 flex lg:hidden flex-col overflow-auto gap-6"
          : "hidden h-full pt-12 pb-8 overflow-auto border-r w-80 bg-background-weak border-border lg:flex"
      }`}
    >
      <div className="flex items-center justify-between w-full h-16 px-6 py-4 border-b lg:hidden">
        <Image src={enmeddLogo} alt="enmedd-logo" width={112} />
        <FiX onClick={handleClose} />
      </div>

      <div className="flex flex-col gap-6 lg:hidden">
        <Link href="/search" className={" flex-col lg:hover:bg-hover flex"}>
          <div className="flex px-6 ">
            <div className={"flex text-strong items-center gap-1"}>
              <FiSearch className="" />
              <h1 className="flex text-sm font-bold">Search</h1>
            </div>
          </div>
        </Link>

        <Link href="/chat" className="flex flex-col lg:hover:bg-hover">
          <div className="flex px-6 ">
            <div className="flex items-center gap-1 text-strong">
              <FiMessageSquare className="" />
              <h1 className="flex text-sm font-bold">Chat</h1>
            </div>
          </div>
        </Link>
      </div>

      <AdminSidebar
        handleClose={handleClose}
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
                    <Wrench size={18} className="my-auto" />
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
                    <Cpu size={18} />
                    <div className="ml-1">LLM</div>
                  </div>
                ),
                link: "/admin/models/llm",
              },
              {
                name: (
                  <div className="flex">
                    <Package size={18} />
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
              ...(SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED
                ? [
                    {
                      name: (
                        <div className="flex">
                          <GroupsIcon size={18} />
                          <div className="ml-1">Groups</div>
                        </div>
                      ),
                      link: "/admin/groups",
                    },
                    {
                      name: (
                        <div className="flex">
                          <KeyIcon size={18} />
                          <div className="ml-1">API Keys</div>
                        </div>
                      ),
                      link: "/admin/api-key",
                    },
                  ]
                : []),
              {
                name: (
                  <div className="flex">
                    <Shield size={18} />
                    <div className="ml-1">Token Rate Limits</div>
                  </div>
                ),
                link: "/admin/token-rate-limits",
              },
            ],
          },
          ...(SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED
            ? [
                {
                  name: "Performance",
                  items: [
                    {
                      name: (
                        <div className="flex">
                          <Activity size={18} />
                          <div className="ml-1">Usage Statistics</div>
                        </div>
                      ),
                      link: "/admin/performance/usage",
                    },
                    {
                      name: (
                        <div className="flex">
                          <DatabaseIcon size={18} />
                          <div className="ml-1">Query History</div>
                        </div>
                      ),
                      link: "/admin/performance/query-history",
                    },
                    // {
                    //   name: (
                    //     <div className="flex">
                    //       <FiBarChart2 size={18} />
                    //       <div className="ml-1">Custom Analytics</div>
                    //     </div>
                    //   ),
                    //   link: "/admin/performance/custom-analytics",
                    // },
                  ],
                },
              ]
            : []),
          {
            name: "Settings",
            items: [
              {
                name: (
                  <div className="flex">
                    <Settings size={18} />
                    <div className="ml-1">Workspace Settings</div>
                  </div>
                ),
                link: "/admin/settings",
              },
              ...(SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED
                ? [
                    {
                      name: (
                        <div className="flex">
                          <ImageIcon size={18} />
                          <div className="ml-1">Whitelabeling</div>
                        </div>
                      ),
                      link: "/admin/whitelabeling",
                    },
                  ]
                : []),
            ],
          },
        ]}
      />
    </div>
  );
};
