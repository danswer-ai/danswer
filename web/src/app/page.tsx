import { SearchSection } from "@/components/search/SearchSection";
import { Header } from "@/components/Header";
import { getCurrentUserSS, processCookies } from "@/lib/userSS";
import { redirect } from "next/navigation";
import { DISABLE_AUTH } from "@/lib/constants";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { ApiKeyModal } from "@/components/openai/ApiKeyModal";
import { buildUrl } from "@/lib/utilsSS";
import { Connector, User } from "@/lib/types";
import { cookies } from "next/headers";
import { SearchType } from "@/lib/search/interfaces";

export default async function Home() {
  const tasks = [
    DISABLE_AUTH ? (async () => null)() : getCurrentUserSS(),
    fetch(buildUrl("/manage/connector"), {
      next: { revalidate: 0 },
      headers: {
        cookie: processCookies(cookies()),
      },
    }),
  ];

  // catch cases where the backend is completely unreachable here
  // without try / catch, will just raise an exception and the page
  // will not render
  let results: (User | Response | null)[] = [null, null];
  try {
    results = await Promise.all(tasks);
  } catch (e) {
    console.log(`Some fetch failed for the main search page - ${e}`);
  }
  const user = results[0] as User | null;
  const connectorsResponse = results[1] as Response | null;

  if (!DISABLE_AUTH && !user) {
    return redirect("/auth/login");
  }

  let connectors: Connector<any>[] = [];
  if (connectorsResponse?.ok) {
    connectors = await connectorsResponse.json();
  } else {
    console.log(`Failed to fetch connectors - ${connectorsResponse?.status}`);
  }

  // needs to be done in a non-client side component due to nextjs
  const storedSearchType = cookies().get("searchType")?.value as
    | string
    | undefined;
  let searchTypeDefault: SearchType =
    storedSearchType !== undefined &&
    SearchType.hasOwnProperty(storedSearchType)
      ? (storedSearchType as SearchType)
      : SearchType.SEMANTIC; // default to semantic

  return (
    <>
      <Header user={user} />
      <div className="m-3">
        <HealthCheckBanner />
      </div>
      <ApiKeyModal />
      <div className="px-24 pt-10 flex flex-col items-center min-h-screen bg-gray-900 text-gray-100">
        <div className="w-full">
          <SearchSection
            connectors={connectors}
            defaultSearchType={searchTypeDefault}
          />
        </div>
      </div>
    </>
  );
}
