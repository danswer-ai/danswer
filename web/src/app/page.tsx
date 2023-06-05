import { SearchSection } from "@/components/search/SearchSection";
import { Header } from "@/components/Header";
import { getCurrentUserSS } from "@/lib/userSS";
import { redirect } from "next/navigation";
import { DISABLE_AUTH } from "@/lib/constants";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { ApiKeyModal } from "@/components/openai/ApiKeyModal";

export default async function Home() {
  let user = null;
  if (!DISABLE_AUTH) {
    user = await getCurrentUserSS();
    if (!user && !DISABLE_AUTH) {
      return redirect("/auth/login");
    }
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
          <SearchSection />
        </div>
      </div>
    </>
  );
}
