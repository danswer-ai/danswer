"use client";

import {
  BookmarkIcon,
  ClosedBookIcon,
  ConnectorIcon,
  CpuIconSkeleton,
  DatabaseIcon,
  DocumentIcon2,
  GroupsIcon,
  KeyIcon,
  NotebookIcon,
  RobotIcon,
  ThumbsUpIcon,
  UsersIcon,
  ZoomInIcon,
} from "./icons/icons";
import { AdminSidebar } from "./admin/connectors/AdminSidebar";
import {
  Cpu,
  Package,
  Settings,
  Shield,
  Wrench,
  Image as ImageIcon,
  Activity,
  SearchIcon,
  Search,
  UserIcon,
  LibraryBigIcon,
  CpuIcon,
  FileSearch,
  FileText,
  Blocks,
  PlugZap,
} from "lucide-react";
import { useContext } from "react";
import { SettingsContext } from "./settings/SettingsProvider";
import { useParams } from "next/navigation";
import { useFeatureFlag } from "./feature_flag/FeatureFlagContext";

interface SideBarProps {
  isTeamspace?: boolean;
}

export const SideBar: React.FC<SideBarProps> = ({ isTeamspace }) => {
  const dynamicSettings = useContext(SettingsContext);
  const { teamspaceId } = useParams();
  const isMultiTeamspaceEnabled = useFeatureFlag("multi_teamspace");
  const isQueryHistoryEnabled = useFeatureFlag("query_history");

  return (
    <div className="w-full h-full p-4 pb-14 overflow-y-auto bg-background">
      <AdminSidebar
        collections={[
          {
            name: "Connections",
            items: [
              {
                name: (
                  <div className="flex items-center gap-2">
                    <Blocks size={20} />
                    <div>Existing Data Sources</div>
                  </div>
                ),
                link: teamspaceId
                  ? `/t/${teamspaceId}/admin/indexing/status`
                  : `/admin/indexing/status`,
              },
              {
                name: (
                  <div className="flex items-center gap-2">
                    <PlugZap size={20} />
                    <div>Connect Data Sources</div>
                  </div>
                ),
                link: teamspaceId
                  ? `/t/${teamspaceId}/admin/data-sources`
                  : `/admin/data-sources`,
              },
            ],
          },
          {
            name: "Document Management",
            items: [
              {
                name: (
                  <div className="flex items-center gap-2">
                    <BookmarkIcon size={20} />
                    <div>Document Sets</div>
                  </div>
                ),
                link: teamspaceId
                  ? `/t/${teamspaceId}/admin/documents/sets`
                  : `/admin/documents/sets`,
              },
              {
                name: (
                  <div className="flex items-center gap-2">
                    <ZoomInIcon size={20} />
                    <div>Explorer</div>
                  </div>
                ),
                link: teamspaceId
                  ? `/t/${teamspaceId}/admin/documents/explorer`
                  : `/admin/documents/explorer`,
              },
              {
                name: (
                  <div className="flex items-center gap-2">
                    <ThumbsUpIcon size={20} />
                    <div>Feedback</div>
                  </div>
                ),
                link: teamspaceId
                  ? `/t/${teamspaceId}/admin/documents/feedback`
                  : `/admin/documents/feedback`,
              },
            ],
          },
          {
            name: "Custom Assistants",
            items: [
              {
                name: (
                  <div className="flex items-center gap-2">
                    <RobotIcon size={20} />
                    <div>Assistants</div>
                  </div>
                ),
                link: teamspaceId
                  ? `/t/${teamspaceId}/admin/assistants`
                  : `/admin/assistants`,
              },
              {
                name: (
                  <div className="flex items-center gap-2">
                    <Wrench size={20} className="my-auto" />
                    <div>Tools</div>
                  </div>
                ),
                link: teamspaceId
                  ? `/t/${teamspaceId}/admin/tools`
                  : `/admin/tools`,
              },

              ...(!teamspaceId
                ? [
                    {
                      name: (
                        <div className="flex items-center gap-2">
                          <LibraryBigIcon className="my-auto" size={20} />
                          <div>Prompt Library</div>
                        </div>
                      ),
                      link: "/admin/prompt-library",
                    },
                  ]
                : []),
              // {
            ],
          },

          ...(!teamspaceId
            ? [
                {
                  name: "Configuration",
                  items: [
                    {
                      name: (
                        <div className="flex items-center gap-2">
                          <CpuIcon className="my-auto" size={20} />
                          <div>LLM</div>
                        </div>
                      ),
                      link: "/admin/configuration/llm",
                    },
                    {
                      error: dynamicSettings?.settings.needs_reindexing,
                      name: (
                        <div className="flex items-center gap-2">
                          <FileSearch className="my-auto" size={20} />
                          <div>Search Settings</div>
                        </div>
                      ),
                      link: "/admin/configuration/search",
                    },
                    {
                      name: (
                        <div className="flex items-center gap-2">
                          <FileText className="my-auto" size={20} />
                          <div>Document Processing</div>
                        </div>
                      ),
                      link: "/admin/configuration/document-processing",
                    },
                  ],
                },
              ]
            : []),
          {
            name: "User Management",
            items: [
              {
                name: (
                  <div className="flex items-center gap-2">
                    <UserIcon size={20} />
                    <div>Users</div>
                  </div>
                ),
                link: teamspaceId
                  ? `/t/${teamspaceId}/admin/users`
                  : `/admin/users`,
              },

              ...(isMultiTeamspaceEnabled && !isTeamspace
                ? [
                    {
                      name: (
                        <div className="flex items-center gap-2">
                          <GroupsIcon size={20} />
                          <div>Teamspaces</div>
                        </div>
                      ),
                      link: "/admin/teams",
                    },
                  ]
                : []),
              ...(!isTeamspace
                ? [
                    {
                      name: (
                        <div className="flex items-center gap-2">
                          <KeyIcon size={20} />
                          <div>API Keys</div>
                        </div>
                      ),
                      link: "/admin/api-key",
                    },
                    {
                      name: (
                        <div className="flex items-center gap-2">
                          <Shield size={20} />
                          <div>Token Rate Limits</div>
                        </div>
                      ),
                      link: "/admin/token-rate-limits",
                    },
                  ]
                : []),
            ],
          },
          {
            name: "Performance",
            items: [
              {
                name: (
                  <div className="flex items-center gap-2">
                    <Activity size={20} />
                    <div>Usage Statistics</div>
                  </div>
                ),
                link: teamspaceId
                  ? `/t/${teamspaceId}/admin/performance/usage`
                  : `/admin/performance/usage`,
              },
              ...(isQueryHistoryEnabled
                ? [
                    {
                      name: (
                        <div className="flex items-center gap-2">
                          <DatabaseIcon size={20} />
                          <div>Query History</div>
                        </div>
                      ),
                      link: teamspaceId
                        ? `/t/${teamspaceId}/admin/performance/query-history`
                        : `/admin/performance/query-history`,
                    },
                  ]
                : []),
              // {
              //   name: (
              //     <div className="flex items-center gap-2">
              //       <FiBarChart2 size={20} />
              //       <div >Custom Analytics</div>
              //     </div>
              //   ),
              //   link: "/admin/performance/custom-analytics",
              // },
            ],
          },
          {
            name: "Settings",
            items: [
              ...(isTeamspace
                ? [
                    {
                      name: (
                        <div className="flex items-center gap-2">
                          <Settings size={20} />
                          <div>Teamspace Settings</div>
                        </div>
                      ),
                      link: teamspaceId
                        ? `/t/${teamspaceId}/admin/settings`
                        : `/admin/settings`,
                    },
                  ]
                : [
                    {
                      name: (
                        <div className="flex items-center gap-2">
                          <Settings size={20} />
                          <div>Workspace Settings</div>
                        </div>
                      ),
                      link: "/admin/settings",
                    },
                  ]),
            ],
          },
        ]}
      />
    </div>
  );
};
