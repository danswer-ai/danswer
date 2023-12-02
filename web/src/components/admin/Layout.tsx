import { Header } from "@/components/Header";
import { Sidebar } from "@/components/admin/connectors/Sidebar";
import {
  NotebookIcon,
  KeyIcon,
  UsersIcon,
  ThumbsUpIcon,
  BookmarkIcon,
  CPUIcon,
  ZoomInIcon,
  RobotIcon,
  ConnectorIcon,
} from "@/components/icons/icons";
import { getAuthDisabledSS, getCurrentUserSS } from "@/lib/userSS";
import { redirect } from "next/navigation";

export async function Layout({ children }: { children: React.ReactNode }) {
  const [authDisabled, user] = await Promise.all([
    getAuthDisabledSS(),
    getCurrentUserSS(),
  ]);

  if (!authDisabled) {
    if (!user) {
      return redirect("/auth/login");
    }
    if (user.role !== "admin") {
      return redirect("/");
    }
  }

  return (
    <div>
      <Header user={user} />
      <div className="bg-gray-900 pt-8 pb-8 flex">
        <div className="w-72">
          <Sidebar
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
                        <div className="ml-1">Personas</div>
                      </div>
                    ),
                    link: "/admin/personas",
                  },
                  {
                    name: (
                      <div className="flex">
                        <CPUIcon size={18} />
                        <div className="ml-1">Slack Bots</div>
                      </div>
                    ),
                    link: "/admin/bot",
                  },
                ],
              },
              {
                name: "Keys",
                items: [
                  {
                    name: (
                      <div className="flex">
                        <KeyIcon size={18} />
                        <div className="ml-1">OpenAI</div>
                      </div>
                    ),
                    link: "/admin/keys/openai",
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
            ]}
          />
        </div>
        <div className="px-12 bg-gray-900 text-gray-100 w-full">{children}</div>
      </div>
    </div>
  );
}
