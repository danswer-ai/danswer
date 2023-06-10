import { Header } from "@/components/Header";
import { Sidebar } from "@/components/admin/connectors/Sidebar";
import {
  NotebookIcon,
  GithubIcon,
  GlobeIcon,
  GoogleDriveIcon,
  SlackIcon,
  KeyIcon,
  ConfluenceIcon,
  FileIcon,
} from "@/components/icons/icons";
import { DISABLE_AUTH } from "@/lib/constants";
import { getCurrentUserSS } from "@/lib/userSS";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;
  if (!DISABLE_AUTH) {
    user = await getCurrentUserSS();
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
      <div className="bg-gray-900 pt-8 flex">
        <Sidebar
          title="Connector"
          collections={[
            {
              name: "Indexing",
              items: [
                {
                  name: (
                    <div className="flex">
                      <NotebookIcon size="18" />
                      <div className="ml-1">Status</div>
                    </div>
                  ),
                  link: "/admin/indexing/status",
                },
              ],
            },
            {
              name: "Connector Settings",
              items: [
                {
                  name: (
                    <div className="flex">
                      <SlackIcon size="16" />
                      <div className="ml-1">Slack</div>
                    </div>
                  ),
                  link: "/admin/connectors/slack",
                },
                {
                  name: (
                    <div className="flex">
                      <GithubIcon size="16" />
                      <div className="ml-1">Github</div>
                    </div>
                  ),
                  link: "/admin/connectors/github",
                },
                {
                  name: (
                    <div className="flex">
                      <GoogleDriveIcon size="16" />
                      <div className="ml-1">Google Drive</div>
                    </div>
                  ),
                  link: "/admin/connectors/google-drive",
                },
                {
                  name: (
                    <div className="flex">
                      <ConfluenceIcon size="16" />
                      <div className="ml-1">Confluence</div>
                    </div>
                  ),
                  link: "/admin/connectors/confluence",
                },
                {
                  name: (
                    <div className="flex">
                      <GlobeIcon size="16" />
                      <div className="ml-1">Web</div>
                    </div>
                  ),
                  link: "/admin/connectors/web",
                },
                {
                  name: (
                    <div className="flex">
                      <FileIcon size="16" />
                      <div className="ml-1">File</div>
                    </div>
                  ),
                  link: "/admin/connectors/file",
                },
              ],
            },
            {
              name: "Keys",
              items: [
                {
                  name: (
                    <div className="flex">
                      <KeyIcon size="18" />
                      <div className="ml-1">OpenAI</div>
                    </div>
                  ),
                  link: "/admin/keys/openai",
                },
              ],
            },
          ]}
        />
        <div className="px-12 min-h-screen bg-gray-900 text-gray-100 w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
