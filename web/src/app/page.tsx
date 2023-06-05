import { SearchSection } from "@/components/search/SearchSection";
import { Header } from "@/components/Header";
import { getCurrentUserSS } from "@/lib/userSS";
import { redirect } from "next/navigation";
import { DISABLE_AUTH } from "@/lib/constants";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { ApiKeyModal } from "@/components/openai/ApiKeyModal";
import { buildUrl } from "@/lib/utilsSS";
import { User } from "@/lib/types";

export default async function Home() {
  const tasks = [
    DISABLE_AUTH ? (async () => null)() : getCurrentUserSS(),
    fetch(buildUrl("/manage/connector"), {
      next: { revalidate: 0 },
    }),
  ];

  const results = await Promise.all(tasks);
  const user = results[0] as User | null;
  const connectorsResponse = results[1] as Response;

  if (!DISABLE_AUTH && !user) {
    return redirect("/auth/login");
  }

  let connectors = null;
  if (connectorsResponse.ok) {
    connectors = await connectorsResponse.json();
  } else {
    console.log(`Failed to fetch connectors - ${connectorsResponse.status}`);
  }

  return (
    <>
      <Header user={user} />
      <div className="m-3">
        <HealthCheckBanner />
      </div>
      <ApiKeyModal />
      <div className="px-24 pt-10 flex flex-col items-center min-h-screen bg-gray-900 text-gray-100">
        <div className="w-full">
          <SearchSection connectors={connectors} />
        </div>
      </div>
    </>
  );
}
