import { Header } from "@/components/header/Header";
import { AdminSidebar } from "@/components/admin/connectors/AdminSidebar";
import {
  NotebookIcon,
  UsersIcon,
  ThumbsUpIcon,
  BookmarkIcon,
  ZoomInIcon,
  RobotIcon,
  ConnectorIcon,
  GroupsIcon,
  BarChartIcon,
  DatabaseIcon,
  KeyIcon,
} from "@/components/icons/icons";
import { User } from "@/lib/types";
import {
  AuthTypeMetadata,
  getAuthTypeMetadataSS,
  getCurrentUserSS,
} from "@/lib/userSS";
import { SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED } from "@/lib/constants";
import { redirect } from "next/navigation";
import {
  FiActivity,
  FiBarChart2,
  FiCpu,
  FiImage,
  FiPackage,
  FiSettings,
  FiShield,
  FiSlack,
  FiTool,
} from "react-icons/fi";

export async function Layout({ children }: { children: React.ReactNode }) {
  const tasks = [getAuthTypeMetadataSS(), getCurrentUserSS()];

  // catch cases where the backend is completely unreachable here
  // without try / catch, will just raise an exception and the page
  // will not render
  let results: (User | AuthTypeMetadata | null)[] = [null, null];
  try {
    results = await Promise.all(tasks);
  } catch (e) {
    console.log(`Some fetch failed for the main search page - ${e}`);
  }

  const authTypeMetadata = results[0] as AuthTypeMetadata | null;
  const user = results[1] as User | null;

  const authDisabled = authTypeMetadata?.authType === "disabled";
  const requiresVerification = authTypeMetadata?.requiresVerification;
  if (!authDisabled) {
    if (!user) {
      return redirect("/auth/login");
    }
    if (user.role !== "admin") {
      return redirect("/");
    }
    if (!user.is_verified && requiresVerification) {
      return redirect("/auth/waiting-on-verification");
    }
  }

  return (
    <div className="h-screen overflow-y-hidden">
      <div className="absolute top-0 z-50 w-full">
        <Header user={user} />
      </div>
      <div className="flex h-full pt-16">
        <div className="w-80  bg-background-weak pt-12 pb-8 h-full border-r border-border overflow-auto">
          <AdminSidebar
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
                        <FiShield size={18} />
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
                              <FiActivity size={18} />
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
                        {
                          name: (
                            <div className="flex">
                              <FiBarChart2 size={18} />
                              <div className="ml-1">Custom Analytics</div>
                            </div>
                          ),
                          link: "/admin/performance/custom-analytics",
                        },
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
                        <FiSettings size={18} />
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
                              <FiImage size={18} />
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
        <div className="px-12 pt-8 pb-8 h-full overflow-y-auto w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
