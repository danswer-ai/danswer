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
        <div className="px-12 min-h-screen bg-gray-900 text-gray-100 w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
