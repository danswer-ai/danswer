import { Header } from "@/components/Header";
import { getAuthDisabledSS, getCurrentUserSS } from "@/lib/userSS";
import { redirect } from "next/navigation";
import { getBackendVersion, getWebVersion } from "@/lib/version";

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

  let web_version: string | null = null;
  let backend_version: string | null = null;
  try {
    [web_version, backend_version] = await Promise.all([
      getWebVersion(),
      getBackendVersion(),
    ]);
  } catch (e) {
    console.log(`Version info fetch failed - ${e}`);
  }

  return (
    <div>
      <Header user={user} web_version={web_version} backend_version={backend_version} />
      <div className="bg-gray-900 pt-8 flex">
        <div className="px-12 min-h-screen bg-gray-900 text-gray-100 w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
