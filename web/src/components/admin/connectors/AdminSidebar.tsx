// Sidebar.tsx
import React, { useContext } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import Image from "next/image";
import {
  NotebookIcon,
  UsersIcon,
  ThumbsUpIcon,
  BookmarkIcon,
  ZoomInIcon,
  RobotIcon,
  ConnectorIcon,
} from "@/components/icons/icons";
import { FiCpu, FiPackage, FiSettings, FiSlack, FiTool } from "react-icons/fi";

interface Item {
  name: string | JSX.Element;
  link: string;
}

interface Collection {
  name: string | JSX.Element;
  items: Item[];
}

interface Item {
  name: string | JSX.Element;
  link: string;
}

interface Collection {
  name: string | JSX.Element;
  items: Item[];
}

export function AdminSidebar({
  hideonDesktop,
  isOpen,
  toggleAdminSidebar,
}: {
  hideonDesktop?: boolean;
  isOpen: boolean;
  toggleAdminSidebar: () => void;
}) {
  const collections = [
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
  ];

  const settings = useContext(SettingsContext)?.settings;

  return (
    <Sidebar
      hideonDesktop={hideonDesktop}
      onToggle={toggleAdminSidebar}
      padded
      isOpen={isOpen}
    >
      <div className="desktop:hidden pt-6 flex">
        <div className="flex mx-4 justify-between w-full">
          <Link
            className="flex"
            href={
              settings && settings.default_page === "chat" ? "/chat" : "/search"
            }
          >
            <div className="h-[32px] w-[30px]">
              <Image src="/logo.png" alt="Logo" width="1419" height="1520" />
            </div>
            <h1 className="flex text-2xl text-strong font-bold my-auto">
              Danswer
            </h1>
          </Link>
        </div>
      </div>

      <aside className="pt-8 pl-4">
        <nav className="space-y-2 pl-4">
          {collections.map((collection, collectionInd) => (
            <div key={collectionInd}>
              <h2 className="text-xs text-strong font-bold pb-2">
                <div>{collection.name}</div>
              </h2>
              {collection.items.map((item) => (
                <Link key={item.link} href={item.link}>
                  <button className="text-sm block w-48 py-2 px-2 text-left hover:bg-hover-light rounded">
                    <div>{item.name}</div>
                  </button>
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </Sidebar>
  );
}
// // Sidebar.tsx

// import React from "react";
// import Link from "next/link";

// interface Item {
//   name: string | JSX.Element;
//   link: string;
// }

// interface Collection {
//   name: string | JSX.Element;
//   items: Item[];
// }

// export function AdminSidebar({ collections }: { collections: Collection[] }) {
//   return (
//     <aside className="pl-4">
//       <nav className="space-y-2 pl-4">
//         {collections.map((collection, collectionInd) => (
//           <div key={collectionInd}>
//             <h2 className="text-xs text-strong font-bold pb-2 ">
//               <div>{collection.name}</div>
//             </h2>
//             {collection.items.map((item) => (
//               <Link key={item.link} href={item.link}>
//                 <button className="text-sm block w-48 py-2 px-2 text-left hover:bg-hover rounded">
//                   <div className="">{item.name}</div>
//                 </button>
//               </Link>
//             ))}
//           </div>
//         ))}
//       </nav>
//     </aside>
//   );
// }
