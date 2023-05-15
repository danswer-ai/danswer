import { Header } from "@/components/Header";
import { Sidebar } from "@/components/admin/connectors/Sidebar";
import {
  GithubIcon,
  GlobeIcon,
  GoogleDriveIcon,
  SlackIcon,
} from "@/components/icons/icons";
import { getCurrentUserSS } from "@/lib/userSS";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserSS();
  if (!user) {
    return redirect("/auth/login");
  }
  if (user.role !== "admin") {
    return redirect("/");
  }

  return (
    <div>
      <Header user={user} />
      <div className="bg-gray-900 pt-8 flex">
        <Sidebar
          title="Connectors"
          collections={[
            {
              name: "Connectors",
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
                      <GlobeIcon size="16" />
                      <div className="ml-1">Web</div>
                    </div>
                  ),
                  link: "/admin/connectors/web",
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
