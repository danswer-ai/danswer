import { Header } from "@/components/Header";
import { Sidebar } from "@/components/admin/connectors/Sidebar";
import {
  NotebookIcon,
  GithubIcon,
  GlobeIcon,
  GoogleDriveIcon,
  SlackIcon,
  KeyIcon,
  BookstackIcon,
  ConfluenceIcon,
  GuruIcon,
  FileIcon,
  JiraIcon,
  SlabIcon,
  NotionIcon,
  ZulipIcon,
  ProductboardIcon,
  LinearIcon,
  UsersIcon,
  ThumbsUpIcon,
  HubSpotIcon,
  BookmarkIcon,
  CPUIcon,
} from "@/components/icons/icons";
import { getAuthDisabledSS, getCurrentUserSS } from "@/lib/userSS";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <Sidebar
          title="Connector"
          collections={[
            {
              name: "Indexing",
              items: [
                {
                  name: (
                    <div className="flex">
                      <NotebookIcon size={18} />
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
                      <SlackIcon size={16} />
                      <div className="ml-1">Slack</div>
                    </div>
                  ),
                  link: "/admin/connectors/slack",
                },
                {
                  name: (
                    <div className="flex">
                      <GithubIcon size={16} />
                      <div className="ml-1">Github</div>
                    </div>
                  ),
                  link: "/admin/connectors/github",
                },
                {
                  name: (
                    <div className="flex">
                      <GoogleDriveIcon size={16} />
                      <div className="ml-1">Google Drive</div>
                    </div>
                  ),
                  link: "/admin/connectors/google-drive",
                },
                {
                  name: (
                    <div className="flex">
                      <ConfluenceIcon size={16} />
                      <div className="ml-1">Confluence</div>
                    </div>
                  ),
                  link: "/admin/connectors/confluence",
                },
                {
                  name: (
                    <div className="flex">
                      <JiraIcon size={16} />
                      <div className="ml-1">Jira</div>
                    </div>
                  ),
                  link: "/admin/connectors/jira",
                },
                {
                  name: (
                    <div className="flex">
                      <LinearIcon size={16} />
                      <div className="ml-1">Linear</div>
                    </div>
                  ),
                  link: "/admin/connectors/linear",
                },
                {
                  name: (
                    <div className="flex">
                      <ProductboardIcon size={16} />
                      <div className="ml-1">Productboard</div>
                    </div>
                  ),
                  link: "/admin/connectors/productboard",
                },
                {
                  name: (
                    <div className="flex">
                      <SlabIcon size={16} />
                      <div className="ml-1">Slab</div>
                    </div>
                  ),
                  link: "/admin/connectors/slab",
                },
                {
                  name: (
                    <div className="flex">
                      <NotionIcon size={16} />
                      <div className="ml-1">Notion</div>
                    </div>
                  ),
                  link: "/admin/connectors/notion",
                },
                {
                  name: (
                    <div className="flex">
                      <GuruIcon size={16} />
                      <div className="ml-1">Guru</div>
                    </div>
                  ),
                  link: "/admin/connectors/guru",
                },
                {
                  name: (
                    <div className="flex">
                      <BookstackIcon size={16} />
                      <div className="ml-1">BookStack</div>
                    </div>
                  ),
                  link: "/admin/connectors/bookstack",
                },
                {
                  name: (
                    <div className="flex">
                      <ZulipIcon size={16} />
                      <div className="ml-1">Zulip</div>
                    </div>
                  ),
                  link: "/admin/connectors/zulip",
                },
                {
                  name: (
                    <div className="flex">
                      <GlobeIcon size={16} />
                      <div className="ml-1">Web</div>
                    </div>
                  ),
                  link: "/admin/connectors/web",
                },
                {
                  name: (
                    <div className="flex">
                      <FileIcon size={16} />
                      <div className="ml-1">File</div>
                    </div>
                  ),
                  link: "/admin/connectors/file",
                },
                {
                  name: (
                    <div className="flex">
                      <HubSpotIcon size={16} />
                      <div className="ml-1">HubSpot</div>
                    </div>
                  ),
                  link: "/admin/connectors/hubspot",
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
                      <ThumbsUpIcon size={18} />
                      <div className="ml-1">Feedback</div>
                    </div>
                  ),
                  link: "/admin/documents/feedback",
                },
              ],
            },
            {
              name: "Bots",
              items: [
                {
                  name: (
                    <div className="flex">
                      <CPUIcon size={18} />
                      <div className="ml-1">Slack Bot</div>
                    </div>
                  ),
                  link: "/admin/bot",
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
